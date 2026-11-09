import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 403 }
      );
    }

    const [totalOrders, orders, products] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        select: {
          totalAmount: true,
          status: true,
          paymentStatus: true,
        },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          stockQuantity: true,
          title: true,
        },
      }),
    ]);

    const totalRevenue = orders
      .filter(
        (order) =>
          order.status !== "CANCELLED" &&
          order.status !== "PENDING_PAYMENT" &&
          order.status !== "REFUNDED" &&
          order.paymentStatus === "SUCCESS"
      )
      .reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    const pendingOrders = orders.filter(
      (order) => order.status === "PAID" || order.status === "PROCESSING"
    ).length;

    const awaitingPayment = orders.filter(
      (order) => order.paymentStatus === "PENDING_VERIFICATION"
    ).length;

    const lowStockProducts = products.filter(
      (p) => p.stockQuantity <= 5 && p.stockQuantity > 0
    ).length;
    const outOfStockProducts = products.filter(
      (p) => p.stockQuantity === 0
    ).length;

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        awaitingPayment,
        lowStockProducts,
        outOfStockProducts,
        totalProducts: products.length,
      },
    });
  } catch (error) {
    console.error("[VENDOR_STATS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to load vendor stats." },
      { status: 500 }
    );
  }
}
