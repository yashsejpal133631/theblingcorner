import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decrementStock,
  OutOfStockError,
} from "@/lib/orders/inventory";

function mergePayload(
  existing: Prisma.JsonValue | null | undefined,
  next: Record<string, unknown>
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...base, ...next } as Prisma.InputJsonValue;
}

function isValidSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) return false;

  try {
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

/**
 * POST /api/payments/webhook
 *
 * Razorpay server-to-server webhook. The secret is mandatory and unknown or
 * mismatched events are acknowledged without changing any order.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (
    !webhookSecret ||
    webhookSecret === "YourWebhookSecret" ||
    webhookSecret.includes("placeholder")
  ) {
    console.error(
      "[RAZORPAY_WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured; refusing event."
    );
    return NextResponse.json(
      { error: "Webhook is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !isValidSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 }
    );
  }

  const eventType = String(event?.event || "");
  const eventId = String(event?.id || `${eventType}_${Date.now()}`);

  if (eventType !== "payment.captured" && eventType !== "order.paid") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderEntity = event?.payload?.order?.entity || null;
  const paymentEntity = event?.payload?.payment?.entity || null;

  const razorpayOrderId = paymentEntity?.order_id
    ? String(paymentEntity.order_id)
    : orderEntity?.id
    ? String(orderEntity.id)
    : null;
  const razorpayPaymentId = paymentEntity?.id
    ? String(paymentEntity.id)
    : null;
  const paidAmount = Number(
    paymentEntity?.amount ?? orderEntity?.amount_paid ?? NaN
  );
  const currency = String(
    paymentEntity?.currency || orderEntity?.currency || "INR"
  );

  if (!razorpayOrderId || !razorpayPaymentId || !Number.isFinite(paidAmount)) {
    return NextResponse.json({ received: true, ignored: "missing_fields" });
  }

  const payment = await prisma.payment.findFirst({
    where: { gatewayOrderId: razorpayOrderId },
    include: {
      order: {
        include: { items: true },
      },
    },
  });

  if (!payment) {
    console.warn(
      `[RAZORPAY_WEBHOOK] No payment found for Razorpay order ${razorpayOrderId}.`
    );
    return NextResponse.json({ received: true, ignored: "unknown_order" });
  }

  const order = payment.order;

  if (payment.status === "SUCCESS" && order.status === "PAID") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  const expectedPaise = Math.round(Number(payment.amount) * 100);
  if (paidAmount !== expectedPaise || currency !== "INR") {
    await prisma.auditLog.create({
      data: {
        userId: order.userId || null,
        action: "PAYMENT_WEBHOOK_MISMATCH",
        resource: "PAYMENT",
        details: {
          orderNumber: order.orderNumber,
          razorpayOrderId,
          razorpayPaymentId,
          expectedPaise,
          paidAmount,
          currency,
          eventId,
        },
      },
    }).catch(() => undefined);

    return NextResponse.json({
      received: true,
      ignored: "amount_or_currency_mismatch",
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({
        where: { id: payment.id },
      });
      if (!current) return;

      const payload =
        current.payload &&
        typeof current.payload === "object" &&
        !Array.isArray(current.payload)
          ? (current.payload as Record<string, unknown>)
          : {};

      const processedEvents = Array.isArray(payload.webhookEventIds)
        ? (payload.webhookEventIds as string[])
        : [];
      if (processedEvents.includes(eventId)) return;

      // Stock is reserved at checkout. Legacy orders are claimed here.
      if (payload.stockReserved !== true) {
        await decrementStock(
          tx,
          order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            title: item.title,
          }))
        );
      }

      await tx.payment.update({
        where: { id: current.id },
        data: {
          gatewayPaymentId: razorpayPaymentId,
          status: "SUCCESS",
          payload: mergePayload(current.payload, {
            stockReserved: true,
            verifiedAt: new Date().toISOString(),
            verifiedVia: "webhook",
            webhookEventIds: [...processedEvents, eventId].slice(-20),
          }),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentStatus: "SUCCESS",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: order.userId || null,
          action: "ORDER_PAYMENT_SUCCESS",
          resource: "ORDER",
          details: {
            orderNumber: order.orderNumber,
            totalAmount: Number(order.totalAmount),
            paymentId: razorpayPaymentId,
            gateway: "RAZORPAY",
            eventId,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      await prisma.auditLog.create({
        data: {
          userId: order.userId || null,
          action: "PAYMENT_WEBHOOK_OUT_OF_STOCK",
          resource: "PAYMENT",
          details: {
            orderNumber: order.orderNumber,
            razorpayPaymentId,
            message: error.message,
          },
        },
      }).catch(() => undefined);
    } else {
      console.error("[RAZORPAY_WEBHOOK_ERROR]", error);
      return NextResponse.json(
        { error: "Webhook processing failed." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
