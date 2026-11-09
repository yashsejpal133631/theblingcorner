import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decrementStock,
  OutOfStockError,
  restock,
  type StockLine,
} from "@/lib/orders/inventory";

export class UpiVerificationError extends Error {
  readonly status: number;

  constructor(message: string, status: number = 409) {
    super(message);
    this.name = "UpiVerificationError";
    this.status = status;
  }
}

/**
 * UPI reference numbers (UTR / RRN) are always 12 digits. Stripping spaces and
 * separators makes the check tolerant of how customers copy the value from
 * different payment apps, while still rejecting anything that is not exactly
 * 12 digits.
 */
export function normalizeUtr(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 12 ? digits : null;
}

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

function payloadOf(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stockLines(order: {
  items: Array<{ productId: string; quantity: number; title: string }>;
}): StockLine[] {
  return order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    title: item.title,
  }));
}

interface AdminActionOptions {
  paymentId: string;
  adminUserId: string;
  adminEmail?: string;
  note?: string;
  ip?: string;
}

/**
 * Approves a Direct UPI payment after the owner has matched the UTR against the
 * bank statement. Runs in one transaction:
 * - validates the amount and current status
 * - reserves stock for legacy orders that were created before reservations
 * - marks the payment and order paid
 * - writes an audit record
 */
export async function approveUpiPayment(options: AdminActionOptions) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: options.paymentId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!payment) {
      throw new UpiVerificationError("Payment record not found.", 404);
    }

    const order = payment.order;

    if (payment.gateway !== "DIRECT_UPI") {
      throw new UpiVerificationError(
        "Only Direct UPI payments can be approved from this queue.",
        409
      );
    }

    if (payment.status === "SUCCESS" && order.status === "PAID") {
      return {
        alreadyProcessed: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    }

    if (payment.status !== "PENDING_VERIFICATION") {
      throw new UpiVerificationError(
        `Payment is not awaiting verification (current status: ${payment.status}).`,
        409
      );
    }

    if (order.paymentStatus !== "PENDING_VERIFICATION") {
      throw new UpiVerificationError(
        "Order is not awaiting payment verification.",
        409
      );
    }

    if (Number(payment.amount) !== Number(order.totalAmount)) {
      throw new UpiVerificationError(
        "Payment amount does not match the order total. Do not approve until this is reconciled.",
        409
      );
    }

    if (!payment.gatewayPaymentId || !/^\d{12}$/.test(payment.gatewayPaymentId)) {
      throw new UpiVerificationError(
        "Payment has no valid 12-digit UTR attached.",
        409
      );
    }

    const payload = payloadOf(payment.payload);
    let stockReserved = payload.stockReserved === true;

    // Orders created before stock reservation was introduced still need their
    // inventory claimed when the payment is approved.
    if (!stockReserved) {
      try {
        await decrementStock(tx, stockLines(order));
      } catch (error) {
        if (error instanceof OutOfStockError) {
          throw new UpiVerificationError(error.message, 409);
        }
        throw error;
      }
      stockReserved = true;
    }

    const verifiedAt = new Date().toISOString();

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        payload: mergePayload(payment.payload, {
          stockReserved,
          verifiedAt,
          verifiedBy: options.adminUserId,
          ...(options.note ? { verificationNote: options.note } : {}),
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
        userId: options.adminUserId,
        action: "UPI_PAYMENT_APPROVED",
        resource: "PAYMENT",
        ipAddress: options.ip || null,
        details: {
          orderNumber: order.orderNumber,
          paymentId: payment.id,
          utr: payment.gatewayPaymentId,
          amount: Number(order.totalAmount),
          approvedBy: options.adminEmail || options.adminUserId,
          note: options.note || null,
        },
      },
    });

    return {
      alreadyProcessed: false,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  });
}

/**
 * Rejects a Direct UPI payment and cancels the order. Stock that was reserved
 * at checkout is returned exactly once, guarded by payload flags.
 */
export async function rejectUpiPayment(
  options: AdminActionOptions & { reason: string }
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: options.paymentId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!payment) {
      throw new UpiVerificationError("Payment record not found.", 404);
    }

    const order = payment.order;

    if (payment.status === "SUCCESS" || order.status === "PAID") {
      throw new UpiVerificationError(
        "This payment has already been approved and cannot be rejected. Use a refund flow instead.",
        409
      );
    }

    if (payment.status === "FAILED" || order.status === "CANCELLED") {
      return {
        alreadyProcessed: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    }

    if (payment.status !== "PENDING_VERIFICATION") {
      throw new UpiVerificationError(
        `Payment is not awaiting verification (current status: ${payment.status}).`,
        409
      );
    }

    const payload = payloadOf(payment.payload);
    const wasReserved = payload.stockReserved === true;
    const alreadyRestored = payload.stockRestored === true;

    if (wasReserved && !alreadyRestored) {
      await restock(tx, stockLines(order));
    }

    const rejectedAt = new Date().toISOString();

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        payload: mergePayload(payment.payload, {
          rejectedAt,
          rejectedBy: options.adminUserId,
          rejectionReason: options.reason,
          stockRestored: wasReserved || alreadyRestored,
        }),
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: options.adminUserId,
        action: "UPI_PAYMENT_REJECTED",
        resource: "PAYMENT",
        ipAddress: options.ip || null,
        details: {
          orderNumber: order.orderNumber,
          paymentId: payment.id,
          utr: payment.gatewayPaymentId,
          amount: Number(order.totalAmount),
          reason: options.reason,
          rejectedBy: options.adminEmail || options.adminUserId,
        },
      },
    });

    return {
      alreadyProcessed: false,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  });
}
