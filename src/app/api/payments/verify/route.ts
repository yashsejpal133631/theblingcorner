import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import {
  enforceRateLimit,
  getClientIp,
  jsonError,
  rejectCrossOrigin,
} from "@/lib/http";
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

/**
 * POST /api/payments/verify
 *
 * Verifies the Razorpay checkout signature and marks the matching database
 * order paid. A missing order is an error, never a simulated success.
 */
export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(
    request,
    "payment_verify",
    20,
    60 * 1000
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonError("Invalid JSON request body.", 400);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderNumber } =
      body as Record<string, unknown>;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      typeof orderNumber !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderNumber
    ) {
      return jsonError(
        "Missing required payment verification parameters.",
        400
      );
    }

    const signatureValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!signatureValid) {
      return jsonError(
        "Payment verification failed. Invalid digital signature.",
        400
      );
    }

    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
      include: { items: true, payment: true },
    });

    if (!order) {
      return jsonError("Order not found for this payment.", 404);
    }

    if (order.paymentMethod !== "RAZORPAY" || order.payment?.gateway !== "RAZORPAY") {
      return jsonError("This order is not a Razorpay order.", 409);
    }

    if (order.payment.gatewayOrderId !== razorpay_order_id) {
      return jsonError(
        "Payment does not belong to this order.",
        409
      );
    }

    if (order.status === "PAID" && order.paymentStatus === "SUCCESS") {
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: "Order already confirmed.",
        orderNumber: order.orderNumber,
      });
    }

    // A Razorpay payment id must not be attached to a different order.
    const paymentIdOwner = await prisma.payment.findUnique({
      where: { gatewayPaymentId: razorpay_payment_id },
      select: { id: true },
    });
    if (paymentIdOwner && paymentIdOwner.id !== order.payment.id) {
      return jsonError(
        "This Razorpay payment has already been used for another order.",
        409
      );
    }

    const session = await getSession();
    const clientIp = getClientIp(request);

    try {
      await prisma.$transaction(async (tx) => {
        const currentPayment = await tx.payment.findUnique({
          where: { id: order.payment!.id },
        });

        if (!currentPayment) {
          throw new Error("Payment record disappeared during verification.");
        }

        const payload =
          currentPayment.payload &&
          typeof currentPayment.payload === "object" &&
          !Array.isArray(currentPayment.payload)
            ? (currentPayment.payload as Record<string, unknown>)
            : {};

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
          where: { id: currentPayment.id },
          data: {
            gatewayPaymentId: razorpay_payment_id,
            gatewaySignature: razorpay_signature,
            status: "SUCCESS",
            payload: mergePayload(currentPayment.payload, {
              stockReserved: true,
              verifiedAt: new Date().toISOString(),
              verifiedVia: "checkout_signature",
              ...(session?.userId ? { verifiedByUserId: session.userId } : {}),
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
            userId: session?.userId || order.userId || null,
            action: "ORDER_PAYMENT_SUCCESS",
            resource: "ORDER",
            ipAddress: clientIp,
            details: {
              orderNumber: order.orderNumber,
              totalAmount: Number(order.totalAmount),
              paymentId: razorpay_payment_id,
              gateway: "RAZORPAY",
            },
          },
        });
      });
    } catch (error) {
      if (error instanceof OutOfStockError) {
        return jsonError(
          "Payment was verified, but stock is no longer available. Support will contact you for a refund.",
          409
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      idempotent: false,
      message: "Payment verified and order confirmed.",
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("[PAYMENT_VERIFICATION_ERROR]", error);
    return jsonError(
      "An unexpected error occurred during payment verification.",
      500
    );
  }
}
