import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { guestEmail: session.email.toLowerCase() },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      totalAmount: Number(o.totalAmount),
      subtotal: Number(o.subtotal),
      shippingFee: Number(o.shippingFee),
      trackingNumber: o.trackingNumber,
      courierPartner: o.courierPartner,
      upiUtrNumber: o.upiUtrNumber,
      shippingAddress: o.shippingAddress,
      items: o.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.unitPrice),
        productName: item.title,
        productSlug: item.product?.slug || "",
        imageUrl:
          item.imageUrl ||
          item.product?.images?.[0]?.url ||
          "/placeholder.svg",
      })),
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("[ACCOUNT_ORDERS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve your order history." },
      { status: 500 }
    );
  }
}
