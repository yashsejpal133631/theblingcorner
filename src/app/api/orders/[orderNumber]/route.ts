import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { verifyOrderAccessToken } from "@/lib/orders/access";
import {
  allowedTargetsFor,
  canActorTransition,
  type ActorRole,
  type OrderStatusValue,
} from "@/lib/orders/status";
import { restock, type StockLine } from "@/lib/orders/inventory";
import {
  enforceRateLimit,
  getClientIp,
  jsonError,
  rejectCrossOrigin,
} from "@/lib/http";
import { z } from "zod";

const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  courierName: z.string().trim().max(100).optional().nullable(),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

interface ShippingAddressJson {
  fullName?: string;
  phone?: string;
  email?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  zone?: string;
}

const PLACEHOLDER_IMAGE = "/placeholder.svg";

function normalizeContact(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : trimmed;
}

function contactMatches(
  order: {
    guestEmail: string | null;
    guestPhone: string | null;
    shippingAddress: Prisma.JsonValue;
  },
  contact: string
): boolean {
  const address = (order.shippingAddress as ShippingAddressJson) || {};
  const normalized = normalizeContact(contact);
  if (!normalized) return false;

  const candidates = [
    order.guestEmail,
    order.guestPhone,
    address.email,
    address.phone,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return candidates.some((value) => normalizeContact(value) === normalized);
}

function payloadOf(
  value: Prisma.JsonValue | null | undefined
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * GET /api/orders/[orderNumber]
 *
 * Order details require proof of ownership:
 * - an authenticated vendor/admin,
 * - the customer account that placed the order,
 * - the signed access token returned at checkout, or
 * - the phone/email used on the order (`?contact=`).
 *
 * This stops order numbers from being used to harvest customer addresses.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimited = enforceRateLimit(request, "order_lookup", 30, 60 * 1000);
  if (rateLimited) return rateLimited;

  try {
    const { orderNumber } = await params;
    const cleanOrderNumber = orderNumber?.trim().toUpperCase();

    if (!cleanOrderNumber) {
      return jsonError("Order number is required.", 400);
    }

    const { searchParams } = new URL(request.url);
    const contact = searchParams.get("contact")?.trim() || "";
    const token = searchParams.get("token")?.trim() || "";

    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                title: true,
                slug: true,
                weightGrams: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            gateway: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!order) {
      return jsonError(
        `Order '${cleanOrderNumber}' was not found. Please double-check your order reference.`,
        404
      );
    }

    const session = await getSession();
    const isStaff =
      session?.role === "VENDOR" || session?.role === "SUPER_ADMIN";
    const isOwner = Boolean(session?.userId && order.userId === session.userId);
    const hasToken = await verifyOrderAccessToken(token, order.orderNumber);
    const hasContact = contact ? contactMatches(order, contact) : false;

    if (!isStaff && !isOwner && !hasToken && !hasContact) {
      return jsonError(
        "This order is protected. Enter the phone number or email used at checkout to view it.",
        403
      );
    }

    const address = (order.shippingAddress as ShippingAddressJson) || {};
    const phone = address.phone || order.guestPhone || "";
    const maskedPhone =
      phone.length >= 10
        ? phone.replace(/(\d{2})\d{4}(\d{4})/, "$1****$2")
        : phone;

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        totalAmount: Number(order.totalAmount),
        totalWeightGrams: order.totalWeightGrams,
        shippingZone: address.zone || "LOCAL",
        trackingNumber: order.trackingNumber,
        courierName: order.courierPartner,
        paymentMethod: order.paymentMethod || "DIRECT_UPI",
        upiUtrLast4: order.upiUtrNumber
          ? order.upiUtrNumber.slice(-4)
          : null,
        recipientName: address.fullName || "Customer",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        maskedPhone,
        items: order.items.map((item) => ({
          id: item.id,
          title: item.title,
          variantTitle: null,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          weightGrams: item.product?.weightGrams ?? 150,
          thumbnailUrl:
            item.imageUrl ||
            item.product?.images?.[0]?.url ||
            PLACEHOLDER_IMAGE,
        })),
        payment: order.payment
          ? {
              status: order.payment.status,
              paymentMethod: order.payment.gateway,
              updatedAt: order.payment.updatedAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[GET_ORDER_ERROR]", error);
    return jsonError("Failed to retrieve order.", 500);
  }
}

/**
 * PATCH /api/orders/[orderNumber]
 *
 * Staff status updater. Enforces the order state machine, requires tracking
 * details before dispatch, restocks cancelled orders once, and refuses to set
 * PAID without payment verification.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(
    request,
    "order_status_update",
    60,
    60 * 1000
  );
  if (rateLimited) return rateLimited;

  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return jsonError(
        "Unauthorized. Vendor or Admin privileges required.",
        403
      );
    }

    const { orderNumber } = await params;
    const cleanOrderNumber = orderNumber?.trim().toUpperCase();

    const body = await request.json().catch(() => null);
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message || "Invalid status update data.",
        400
      );
    }

    const { status: targetStatus, courierName, trackingNumber } = parsed.data;

    if (targetStatus === "PAID") {
      return jsonError(
        "Orders become PAID only through payment verification, not a manual status change.",
        403
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      return jsonError(`Order '${cleanOrderNumber}' was not found.`, 404);
    }

    const currentStatus = order.status as OrderStatusValue;
    const role = session.role as ActorRole;
    const nextStatus = targetStatus as OrderStatusValue;

    if (!canActorTransition(role, currentStatus, nextStatus)) {
      return jsonError(
        `Cannot change order from ${currentStatus} to ${nextStatus}.`,
        409,
        {
          code: "INVALID_STATUS_TRANSITION",
          currentStatus,
          allowedTargets: allowedTargetsFor(role, currentStatus),
        }
      );
    }

    if (nextStatus === "SHIPPED") {
      if (!trackingNumber || !courierName) {
        return jsonError(
          "Courier name and tracking number are required before marking an order shipped.",
          400
        );
      }
    }

    if (nextStatus === "DELIVERED" && !order.trackingNumber && !trackingNumber) {
      return jsonError(
        "This order has no tracking number and cannot be marked delivered.",
        409
      );
    }

    const clientIp = getClientIp(request);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const guard = await tx.order.updateMany({
        where: { id: order.id, status: currentStatus },
        data: {
          status: nextStatus,
          ...(courierName !== undefined
            ? { courierPartner: courierName || null }
            : {}),
          ...(trackingNumber !== undefined
            ? { trackingNumber: trackingNumber || null }
            : {}),
        },
      });

      if (guard.count !== 1) {
        throw new Error("ORDER_STATUS_CONFLICT");
      }

      if (nextStatus === "CANCELLED") {
        const paymentPayload = payloadOf(order.payment?.payload);
        const wasReserved = paymentPayload.stockReserved === true;
        const alreadyRestored = paymentPayload.stockRestored === true;

        if (wasReserved && !alreadyRestored) {
          const lines: StockLine[] = order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            title: item.title,
          }));
          await restock(tx, lines);
        }

        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: "FAILED" },
        });

        if (order.payment && order.payment.status !== "SUCCESS") {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: "FAILED",
              payload: {
                ...paymentPayload,
                stockRestored: wasReserved || alreadyRestored,
                cancelledAt: new Date().toISOString(),
                cancelledBy: session.userId,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }

      if (nextStatus === "REFUNDED" && order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: "REFUNDED",
            payload: {
              ...payloadOf(order.payment.payload),
              refundMarkedAt: new Date().toISOString(),
              refundMarkedBy: session.userId,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "UPDATE_ORDER_STATUS",
          resource: "ORDER",
          ipAddress: clientIp,
          details: {
            orderNumber: cleanOrderNumber,
            previousStatus: currentStatus,
            newStatus: nextStatus,
            courierPartner: courierName || order.courierPartner,
            trackingNumber: trackingNumber || order.trackingNumber,
            updatedByRole: session.role,
          },
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payment: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Order ${cleanOrderNumber} updated to ${nextStatus}`,
      order: updatedOrder,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_STATUS_CONFLICT") {
      return jsonError(
        "The order was updated by someone else. Refresh and try again.",
        409
      );
    }
    console.error("[PATCH_ORDER_ERROR]", error);
    return jsonError("Failed to update order status.", 500);
  }
}
