import { NextRequest, NextResponse } from "next/server";
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

const VALID_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return jsonError("Unauthorized access.", 403);
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    if (statusFilter && !VALID_STATUSES.has(statusFilter)) {
      return jsonError("Invalid status filter.", 400);
    }

    const orders = await prisma.order.findMany({
      where: statusFilter
        ? { status: statusFilter as never }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                title: true,
                weightGrams: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            gateway: true,
          },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map((o) => {
        const addr = (o.shippingAddress as AddressSnapshot) || {};
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          totalAmount: Number(o.totalAmount),
          subtotal: Number(o.subtotal),
          shippingFee: Number(o.shippingFee),
          totalWeightGrams: o.totalWeightGrams,
          shippingZone: addr.zone || "LOCAL",
          trackingNumber: o.trackingNumber,
          courierName: o.courierPartner,
          paymentMethod: o.paymentMethod || "DIRECT_UPI",
          upiUtrNumber: o.upiUtrNumber || null,
          upiScreenshotUrl: o.upiScreenshotUrl || null,
          createdAt: o.createdAt,
          customer: {
            fullName: addr.fullName || "Customer",
            phone: addr.phone || o.guestPhone || "",
            email: addr.email || o.guestEmail || "",
            city: addr.city || "",
            state: addr.state || "",
            pincode: addr.pincode || "",
            street: addr.street || "",
            landmark: addr.landmark || "",
          },
          items: o.items.map((i) => ({
            id: i.id,
            title: i.title,
            quantity: i.quantity,
            totalPrice: Number(i.totalPrice),
            weightGrams: i.product?.weightGrams ?? 150,
            thumbnailUrl:
              i.imageUrl || i.product?.images?.[0]?.url || "/placeholder.svg",
          })),
          payment: o.payment
            ? {
                id: o.payment.id,
                status: o.payment.status,
                paymentMethod: o.payment.gateway,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("[VENDOR_ORDERS_ERROR]", error);
    return jsonError("Failed to load vendor orders.", 500);
  }
}
