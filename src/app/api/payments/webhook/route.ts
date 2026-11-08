import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "YourWebhookSecret";

    // 1. Verify Webhook Signature if secret is configured
    if (signature && webhookSecret && webhookSecret !== "YourWebhookSecret") {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(signature, "utf-8")
      );

      if (!isMatch) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    // 2. Handle order.paid or payment.captured events
    if (event.event === "order.paid" || event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const gatewayPaymentId = paymentEntity?.id;

      if (!gatewayOrderId) {
        return NextResponse.json({ received: true });
      }

      const order = await prisma.order.findFirst({
        where: { payment: { gatewayOrderId } },
        include: { items: true, payment: true },
      });

      if (!order) {
        return NextResponse.json({ received: true, note: "Order not found" });
      }

      // Idempotency check: Already processed
      if (order.status === "PAID" || order.paymentStatus === "SUCCESS") {
        return NextResponse.json({ received: true, status: "already_processed" });
      }

      // Atomic fulfillment
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { orderId: order.id },
          data: {
            gatewayPaymentId: gatewayPaymentId || order.payment?.gatewayPaymentId,
            status: "SUCCESS",
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paymentStatus: "SUCCESS",
          },
        });

        // Decrement stock
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[RAZORPAY_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

