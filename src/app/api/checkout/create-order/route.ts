import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkoutOrderSchema } from "@/lib/validations/checkout";
import { resolvePincodeZone, calculateShippingFee } from "@/lib/shipping";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/razorpay";
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
  type StockLine,
} from "@/lib/orders/inventory";
import { createOrderAccessToken } from "@/lib/orders/access";
import { normalizeUtr } from "@/lib/payments/upi";
import { UPI_VPA } from "@/lib/upi-config";

const DATE_PREFIX = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

function generateOrderNumber(): string {
  return `TBC-${DATE_PREFIX()}-${crypto.randomInt(100000, 1000000)}`;
}

class DuplicateUtrError extends Error {
  constructor() {
    super("Duplicate UTR");
    this.name = "DuplicateUtrError";
  }
}

function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  if (!field) return true;
  return String(error.meta?.target ?? "").includes(field);
}

interface OrderForResponse {
  id: string;
  orderNumber: string;
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  paymentStatus: string;
  status: string;
}

async function buildOrderResponse(options: {
  order: OrderForResponse;
  paymentMethod: string;
  paymentStatus: string;
  idempotent: boolean;
  customer: { name: string; email: string; phone: string };
  razorpay?: { orderId: string; keyId: string };
}) {
  const accessToken = await createOrderAccessToken(options.order.orderNumber);

  return NextResponse.json({
    success: true,
    idempotent: options.idempotent,
    orderId: options.order.id,
    orderNumber: options.order.orderNumber,
    amount: Number(options.order.totalAmount),
    subtotal: Number(options.order.subtotal),
    shippingFee: Number(options.order.shippingFee),
    currency: "INR",
    paymentMethod: options.paymentMethod,
    paymentStatus: options.paymentStatus,
    orderStatus: options.order.status,
    accessToken,
    customer: options.customer,
    ...(options.razorpay ? { razorpay: options.razorpay } : {}),
  });
}

/**
 * POST /api/checkout/create-order
 *
 * Creates a real order from database products only. No fallback catalogue, no
 * fake order id, and no "success" unless the order was persisted.
 */
export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(
    request,
    "checkout_create",
    10,
    10 * 60 * 1000
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonError("Invalid JSON request body.", 400);
    }

    const validation = checkoutOrderSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "Invalid checkout data.",
        400
      );
    }

    const {
      items,
      shippingAddress,
      notes,
      paymentMethod,
      expectedTotal,
      discountAmount,
      couponCode,
      upiUtrNumber,
      upiScreenshotUrl,
    } = validation.data;

    const utr = normalizeUtr(upiUtrNumber);
    if (paymentMethod === "DIRECT_UPI" && !utr) {
      return jsonError(
        "A valid 12-digit UPI Reference (UTR) number is required for Direct UPI payment.",
        400
      );
    }

    if (paymentMethod === "RAZORPAY" && !isRazorpayConfigured()) {
      return jsonError(
        "Online card payment is temporarily unavailable. Please use Direct UPI.",
        503
      );
    }

    // Resolve a real user id. A stale JWT may reference a deleted account, so
    // verify the row exists before writing the order foreign key.
    const session = await getSession();
    let userId: string | null = null;
    if (session?.userId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true },
      });
      userId = existingUser?.id ?? null;
    }

    // Deduplicate repeated product lines so the stock reservation is accurate.
    const requestedQuantities = new Map<string, number>();
    for (const item of items) {
      requestedQuantities.set(
        item.productId,
        (requestedQuantities.get(item.productId) || 0) + item.quantity
      );
    }

    const productIds = Array.from(requestedQuantities.keys());
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: true,
      },
    });

    const productMap = new Map(dbProducts.map((product) => [product.id, product]));
    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) {
      return jsonError(
        "One or more items in your bag are no longer available. Please refresh your cart.",
        409,
        { unavailableProductIds: missingIds }
      );
    }

    let subtotal = 0;
    let totalWeightGrams = 0;
    const stockLines: StockLine[] = [];
    const orderItemsToCreate: Array<{
      productId: string;
      title: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      imageUrl: string | null;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return jsonError(
          "One or more items in your bag are no longer available. Please refresh your cart.",
          409
        );
      }

      const variant = item.variantId
        ? product.variants.find((candidate) => candidate.id === item.variantId)
        : undefined;

      if (item.variantId && !variant) {
        return jsonError(
          `The selected option for "${product.title}" is no longer available.`,
          409
        );
      }

      const effectivePrice =
        variant?.price != null ? Number(variant.price) : Number(product.price);
      const effectiveTitle = variant
        ? `${product.title} (${variant.title})`
        : product.title;
      const effectiveWeight =
        variant?.weightGrams ?? product.weightGrams ?? 150;

      const itemTotal = effectivePrice * item.quantity;
      subtotal += itemTotal;
      totalWeightGrams += effectiveWeight * item.quantity;

      orderItemsToCreate.push({
        productId: product.id,
        title: effectiveTitle,
        quantity: item.quantity,
        unitPrice: effectivePrice,
        totalPrice: itemTotal,
        imageUrl: product.images[0]?.url || null,
      });
    }

    const { zone } = resolvePincodeZone(shippingAddress.pincode);
    const shippingFee = calculateShippingFee(totalWeightGrams, zone);
    const safeDiscount = Math.min(Number(discountAmount || 0), subtotal + shippingFee);
    const totalAmount = Number((subtotal + shippingFee - safeDiscount).toFixed(2));

    if (
      expectedTotal !== undefined &&
      Math.abs(expectedTotal - totalAmount) > 0.01
    ) {
      return jsonError(
        "Your cart total changed before payment. Please review the updated amount and try again.",
        409,
        {
          code: "TOTAL_CHANGED",
          amount: totalAmount,
          subtotal,
          shippingFee,
        }
      );
    }

    for (const [productId, quantity] of requestedQuantities.entries()) {
      const product = productMap.get(productId);
      stockLines.push({
        productId,
        quantity,
        title: product?.title || "Item",
      });
    }

    const addressSnapshot = {
      ...shippingAddress,
      zone,
    };

    const customer = {
      name: shippingAddress.fullName,
      email: shippingAddress.email,
      phone: shippingAddress.phone,
    };

    const clientIp = getClientIp(request);

    // Fast idempotency path: a repeated submit with the same UTR should return
    // the original order rather than reserving stock twice.
    if (utr) {
      const existingPayment = await prisma.payment.findUnique({
        where: { gatewayPaymentId: utr },
        include: { order: true },
      });

      if (existingPayment) {
        if (existingPayment.status === "FAILED") {
          return jsonError(
            `This UTR was already submitted for order ${existingPayment.order.orderNumber}, which was not approved. Please contact support with your payment proof.`,
            409
          );
        }

        return buildOrderResponse({
          order: existingPayment.order,
          paymentMethod: existingPayment.order.paymentMethod,
          paymentStatus: existingPayment.order.paymentStatus,
          idempotent: true,
          customer,
        });
      }
    }

    let razorpayOrderId: string | null = null;
    if (paymentMethod === "RAZORPAY") {
      try {
        const razorpayOrder = await createRazorpayOrder({
          amountPaise: Math.round(totalAmount * 100),
          currency: "INR",
          receipt: crypto.randomUUID().slice(0, 30),
          notes: {
            customerEmail: shippingAddress.email,
            customerPhone: shippingAddress.phone,
          },
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (error) {
        console.error("[RAZORPAY_ORDER_CREATE_ERROR]", error);
        return jsonError(
          "Could not start the online payment. Please try Direct UPI or retry in a moment.",
          502
        );
      }
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const orderNumber = generateOrderNumber();

      try {
        const createdOrder = await prisma.$transaction(async (tx) => {
          if (utr) {
            const duplicate = await tx.payment.findUnique({
              where: { gatewayPaymentId: utr },
              select: { id: true },
            });
            if (duplicate) {
              throw new DuplicateUtrError();
            }
          }

          // Reserve inventory at the same moment the order is written.
          await decrementStock(tx, stockLines);

          const order = await tx.order.create({
            data: {
              orderNumber,
              userId,
              guestEmail: shippingAddress.email,
              guestPhone: shippingAddress.phone,
              shippingAddress: addressSnapshot as unknown as Prisma.InputJsonValue,
              subtotal,
              shippingFee,
              discountAmount: safeDiscount,
              totalWeightGrams,
              totalAmount,
              status: "PENDING_PAYMENT",
              paymentStatus:
                paymentMethod === "DIRECT_UPI"
                  ? "PENDING_VERIFICATION"
                  : "PENDING",
              paymentMethod,
              upiUtrNumber: utr,
              upiScreenshotUrl: upiScreenshotUrl || null,
              notes: notes || null,
              items: {
                create: orderItemsToCreate,
              },
              payment: {
                create: {
                  gateway: paymentMethod,
                  gatewayOrderId: razorpayOrderId,
                  gatewayPaymentId: utr,
                  amount: totalAmount,
                  currency: "INR",
                  status:
                    paymentMethod === "DIRECT_UPI"
                      ? "PENDING_VERIFICATION"
                      : "PENDING",
                  payload: {
                    stockReserved: true,
                    submittedAt: new Date().toISOString(),
                    submittedIp: clientIp,
                    upiVpa: UPI_VPA,
                  },
                },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              userId: userId || undefined,
              action:
                paymentMethod === "DIRECT_UPI"
                  ? "UPI_PAYMENT_SUBMITTED"
                  : "ORDER_CREATED",
              resource: "ORDER",
              ipAddress: clientIp,
              details: {
                orderNumber: order.orderNumber,
                totalAmount,
                paymentMethod,
                ...(utr ? { utr } : {}),
              },
            },
          });

          return order;
        });

        return buildOrderResponse({
          order: createdOrder,
          paymentMethod,
          paymentStatus: createdOrder.paymentStatus,
          idempotent: false,
          customer,
          razorpay:
            paymentMethod === "RAZORPAY" && razorpayOrderId
              ? {
                  orderId: razorpayOrderId,
                  keyId: process.env.RAZORPAY_KEY_ID || "",
                }
              : undefined,
        });
      } catch (error) {
        lastError = error;

        if (isUniqueViolation(error, "orderNumber") && attempt < 2) {
          continue;
        }

        if (
          (error instanceof DuplicateUtrError ||
            isUniqueViolation(error, "gatewayPaymentId")) &&
          utr
        ) {
          const existingPayment = await prisma.payment.findUnique({
            where: { gatewayPaymentId: utr },
            include: { order: true },
          });

          if (existingPayment && existingPayment.status !== "FAILED") {
            return buildOrderResponse({
              order: existingPayment.order,
              paymentMethod: existingPayment.order.paymentMethod,
              paymentStatus: existingPayment.order.paymentStatus,
              idempotent: true,
              customer,
            });
          }
        }

        throw error;
      }
    }

    throw lastError || new Error("Could not allocate an order number.");
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return jsonError(error.message, 409, {
        code: "OUT_OF_STOCK",
        productTitle: error.productTitle,
        available: error.available,
      });
    }

    console.error("[CREATE_CHECKOUT_ORDER_ERROR]", error);
    return jsonError(
      "Failed to place your order. No payment has been confirmed. Please try again.",
      500
    );
  }
}
