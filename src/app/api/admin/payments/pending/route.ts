import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

interface AddressSnapshot {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  pincode?: string;
  street?: string;
  landmark?: string;
  zone?: string;
}

function payloadOf(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * GET /api/admin/payments/pending
 *
 * Direct UPI payments waiting for bank-statement matching. Available to the
 * store owner (VENDOR) and the master admin (SUPER_ADMIN).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")
    ) {
      return jsonError("Unauthorized access.", 403);
    }

    const payments = await prisma.payment.findMany({
      where: {
        gateway: "DIRECT_UPI",
        status: "PENDING_VERIFICATION",
      },
      orderBy: { createdAt: "asc" },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    weightGrams: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      count: payments.length,
      payments: payments.map((payment) => {
        const order = payment.order;
        const address = (order.shippingAddress as AddressSnapshot) || {};
        const payload = payloadOf(payment.payload);

        return {
          id: payment.id,
          status: payment.status,
          amount: Number(payment.amount),
          currency: payment.currency,
          utr: payment.gatewayPaymentId || order.upiUtrNumber || null,
          screenshotUrl: order.upiScreenshotUrl || null,
          submittedAt: payload.submittedAt || payment.createdAt,
          createdAt: payment.createdAt,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: Number(order.subtotal),
            shippingFee: Number(order.shippingFee),
            totalAmount: Number(order.totalAmount),
            totalWeightGrams: order.totalWeightGrams,
            createdAt: order.createdAt,
            customer: {
              fullName: address.fullName || "Customer",
              phone: address.phone || order.guestPhone || "",
              email: address.email || order.guestEmail || "",
              city: address.city || "",
              state: address.state || "",
              pincode: address.pincode || "",
              street: address.street || "",
              landmark: address.landmark || "",
            },
            items: order.items.map((item) => ({
              id: item.id,
              title: item.title,
              quantity: item.quantity,
              totalPrice: Number(item.totalPrice),
              weightGrams: item.product?.weightGrams ?? 150,
              thumbnailUrl:
                item.imageUrl ||
                item.product?.images?.[0]?.url ||
                "/placeholder.svg",
            })),
          },
        };
      }),
    });
  } catch (error) {
    console.error("[ADMIN_PENDING_PAYMENTS_ERROR]", error);
    return jsonError("Failed to load pending payments.", 500);
  }
}
