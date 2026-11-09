export type OrderStatusValue =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type ActorRole = "CUSTOMER" | "VENDOR" | "SUPER_ADMIN" | "SYSTEM";

/**
 * Legal state transitions.
 *
 * PAID is only reachable from PENDING_PAYMENT and only by the SYSTEM actor
 * (payment verification). CANCELLED is only for orders whose money has not been
 * confirmed; once paid, the only way back is REFUNDED after a manual refund.
 */
const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "PACKED", "REFUNDED"],
  PROCESSING: ["PACKED", "REFUNDED"],
  PACKED: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function canActorTransition(
  role: ActorRole,
  from: OrderStatusValue,
  to: OrderStatusValue
): boolean {
  if (!canTransition(from, to)) return false;

  // Money states are owned by the payment verification service only.
  if (to === "PAID") return role === "SYSTEM";

  // Refunds move real money and are restricted to the master admin.
  if (to === "REFUNDED") return role === "SUPER_ADMIN";

  if (role === "SYSTEM" || role === "SUPER_ADMIN") return true;

  if (role === "VENDOR") {
    if (to === "PROCESSING" && from === "PAID") return true;
    if (to === "PACKED" && (from === "PROCESSING" || from === "PAID")) return true;
    if (to === "SHIPPED" && from === "PACKED") return true;
    if (to === "DELIVERED" && from === "SHIPPED") return true;
    if (to === "CANCELLED" && from === "PENDING_PAYMENT") return true;
    return false;
  }

  if (role === "CUSTOMER") {
    return to === "CANCELLED" && from === "PENDING_PAYMENT";
  }

  return false;
}

export function isTerminalStatus(status: OrderStatusValue): boolean {
  return status === "CANCELLED" || status === "REFUNDED" || status === "DELIVERED";
}

export function statusRequiresTracking(status: OrderStatusValue): boolean {
  return status === "SHIPPED" || status === "DELIVERED";
}

export function allowedTargetsFor(
  role: ActorRole,
  from: OrderStatusValue
): OrderStatusValue[] {
  return (TRANSITIONS[from] || []).filter((to) => canActorTransition(role, from, to));
}
