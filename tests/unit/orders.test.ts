import { describe, it, expect } from "vitest";
import { z } from "zod";

const orderStatusEnum = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

function maskPhoneNumber(phone: string): string {
  return phone.replace(/(\d{2})\d{4}(\d{4})/, "$1****$2");
}

function getStepIndex(status: string): number {
  switch (status) {
    case "PENDING_PAYMENT":
      return -1;
    case "PAID":
      return 0;
    case "PROCESSING":
      return 1;
    case "PACKED":
      return 2;
    case "SHIPPED":
      return 3;
    case "DELIVERED":
      return 4;
    case "CANCELLED":
      return -2;
    default:
      return 0;
  }
}

describe("Module 6: Order Lifecycle & Tracking Logic", () => {
  it("validates all legal order lifecycle status values", () => {
    const validStatuses = [
      "PENDING_PAYMENT",
      "PAID",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];

    for (const status of validStatuses) {
      expect(orderStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it("rejects illegal or arbitrary status values", () => {
    expect(orderStatusEnum.safeParse("UNKNOWN_STATUS").success).toBe(false);
    expect(orderStatusEnum.safeParse("REFUND_REQUESTED").success).toBe(false);
    expect(orderStatusEnum.safeParse("").success).toBe(false);
  });

  it("accurately computes sequential step progress index", () => {
    expect(getStepIndex("PENDING_PAYMENT")).toBe(-1);
    expect(getStepIndex("PAID")).toBe(0);
    expect(getStepIndex("PROCESSING")).toBe(1);
    expect(getStepIndex("PACKED")).toBe(2);
    expect(getStepIndex("SHIPPED")).toBe(3);
    expect(getStepIndex("DELIVERED")).toBe(4);
    expect(getStepIndex("CANCELLED")).toBe(-2);
  });

  it("masks customer phone number for OWASP data protection on public tracking", () => {
    const phone = "9876543210";
    const masked = maskPhoneNumber(phone);
    expect(masked).toBe("98****3210");
    expect(masked).not.toContain("7654");
  });

  it("sanitizes and normalizes order reference numbers", () => {
    const rawOrder = "  tbc-202611-9876  ";
    const normalized = rawOrder.trim().toUpperCase();
    expect(normalized).toBe("TBC-202611-9876");
    expect(normalized.startsWith("TBC-")).toBe(true);
  });
});

