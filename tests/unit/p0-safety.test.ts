import { describe, it, expect } from "vitest";
import { normalizeUtr } from "@/lib/payments/upi";
import {
  canTransition,
  canActorTransition,
  allowedTargetsFor,
  isTerminalStatus,
  statusRequiresTracking,
  type OrderStatusValue,
} from "@/lib/orders/status";
import { UPI_VPA, MERCHANT_NAME, buildUpiPayUrl, isUpiConfigured } from "@/lib/upi-config";
import {
  createOrderAccessToken,
  verifyOrderAccessToken,
} from "@/lib/orders/access";

describe("P0: UPI reference (UTR) normalization", () => {
  it("accepts a plain 12-digit UTR", () => {
    expect(normalizeUtr("123456789012")).toBe("123456789012");
  });

  it("strips spaces and separators used by payment apps", () => {
    expect(normalizeUtr("1234 5678 9012")).toBe("123456789012");
    expect(normalizeUtr("UTR: 1234-5678-9012")).toBe("123456789012");
    expect(normalizeUtr(" 1234/5678/9012 ")).toBe("123456789012");
  });

  it("rejects references that are not exactly 12 digits", () => {
    expect(normalizeUtr("12345678901")).toBeNull();
    expect(normalizeUtr("1234567890123")).toBeNull();
    expect(normalizeUtr("")).toBeNull();
    expect(normalizeUtr("abcdefghijkl")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(normalizeUtr(null)).toBeNull();
    expect(normalizeUtr(undefined)).toBeNull();
    expect(normalizeUtr(123456789012)).toBeNull();
  });
});

describe("P0: Order status state machine", () => {
  it("allows only legal forward transitions", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransition("PAID", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "PACKED")).toBe(true);
    expect(canTransition("PACKED", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "REFUNDED")).toBe(true);
  });

  it("blocks backward transitions and same-state updates", () => {
    expect(canTransition("PAID", "PENDING_PAYMENT")).toBe(false);
    expect(canTransition("DELIVERED", "SHIPPED")).toBe(false);
    expect(canTransition("PAID", "PAID")).toBe(false);
  });

  it("never allows CANCELLED to leave the terminal state", () => {
    const targets = [
      "PENDING_PAYMENT",
      "PAID",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ] as OrderStatusValue[];
    for (const target of targets) {
      expect(canTransition("CANCELLED", target)).toBe(false);
    }
  });

  it("only the payment system may mark an order PAID", () => {
    expect(canActorTransition("SYSTEM", "PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canActorTransition("SUPER_ADMIN", "PENDING_PAYMENT", "PAID")).toBe(false);
    expect(canActorTransition("VENDOR", "PENDING_PAYMENT", "PAID")).toBe(false);
    expect(canActorTransition("CUSTOMER", "PENDING_PAYMENT", "PAID")).toBe(false);
  });

  it("restricts refunds to the master admin", () => {
    expect(canActorTransition("SUPER_ADMIN", "PAID", "REFUNDED")).toBe(true);
    expect(canActorTransition("VENDOR", "PAID", "REFUNDED")).toBe(false);
    expect(canActorTransition("CUSTOMER", "PAID", "REFUNDED")).toBe(false);
  });

  it("lets customers cancel only before payment is confirmed", () => {
    expect(canActorTransition("CUSTOMER", "PENDING_PAYMENT", "CANCELLED")).toBe(true);
    expect(canActorTransition("CUSTOMER", "PAID", "CANCELLED")).toBe(false);
  });

  it("lets vendors move paid orders through fulfilment", () => {
    expect(canActorTransition("VENDOR", "PAID", "PROCESSING")).toBe(true);
    expect(canActorTransition("VENDOR", "PROCESSING", "PACKED")).toBe(true);
    expect(canActorTransition("VENDOR", "PAID", "PACKED")).toBe(true);
    expect(canActorTransition("VENDOR", "PACKED", "SHIPPED")).toBe(true);
    expect(canActorTransition("VENDOR", "SHIPPED", "DELIVERED")).toBe(true);
  });

  it("excludes PAID from the targets offered to a vendor", () => {
    const targets = allowedTargetsFor("VENDOR", "PENDING_PAYMENT");
    expect(targets).toEqual(["CANCELLED"]);
  });

  it("flags terminal states and tracking requirements", () => {
    expect(isTerminalStatus("CANCELLED")).toBe(true);
    expect(isTerminalStatus("REFUNDED")).toBe(true);
    expect(isTerminalStatus("DELIVERED")).toBe(true);
    expect(isTerminalStatus("PAID")).toBe(false);

    expect(statusRequiresTracking("SHIPPED")).toBe(true);
    expect(statusRequiresTracking("DELIVERED")).toBe(true);
    expect(statusRequiresTracking("PACKED")).toBe(false);
  });
});

describe("P0: UPI configuration", () => {
  it("has a syntactically valid VPA", () => {
    expect(isUpiConfigured()).toBe(true);
    expect(UPI_VPA).toMatch(/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+$/);
  });

  it("builds a UPI deep link with the exact amount and payee", () => {
    const url = buildUpiPayUrl({ amount: 123.45, note: "Order_TBC123" });
    expect(url.startsWith("upi://pay?")).toBe(true);

    const params = new URLSearchParams(url.slice("upi://pay?".length));
    expect(params.get("pa")).toBe(UPI_VPA);
    expect(params.get("pn")).toBe(MERCHANT_NAME);
    expect(params.get("am")).toBe("123.45");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tn")).toBe("Order_TBC123");
  });

  it("always formats the amount with two decimals", () => {
    const params = new URLSearchParams(
      buildUpiPayUrl({ amount: 200, note: "x" }).slice("upi://pay?".length)
    );
    expect(params.get("am")).toBe("200.00");
  });
});

describe("P0: Signed order access tokens", () => {
  it("verifies a token for the order it was issued for", async () => {
    const token = await createOrderAccessToken("TBC-202611-123456");
    await expect(
      verifyOrderAccessToken(token, "TBC-202611-123456")
    ).resolves.toBe(true);
  });

  it("rejects a token reused for a different order", async () => {
    const token = await createOrderAccessToken("TBC-202611-123456");
    await expect(
      verifyOrderAccessToken(token, "TBC-202611-999999")
    ).resolves.toBe(false);
  });

  it("rejects missing or malformed tokens", async () => {
    await expect(
      verifyOrderAccessToken(null, "TBC-202611-123456")
    ).resolves.toBe(false);
    await expect(
      verifyOrderAccessToken("not-a-jwt", "TBC-202611-123456")
    ).resolves.toBe(false);
  });
});
