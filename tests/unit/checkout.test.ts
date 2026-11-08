import { describe, it, expect } from "vitest";
import {
  checkoutOrderSchema,
  shippingAddressSchema,
} from "@/lib/validations/checkout";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import crypto from "crypto";

describe("Module 5: Checkout & Payments Validation", () => {
  const validAddress = {
    fullName: "Aanya Sharma",
    phone: "9876543210",
    email: "aanya@example.com",
    street: "Flat 402, Lotus Residency, MG Road",
    landmark: "Near Metro Gate 2",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
  };

  const validCheckout = {
    items: [
      {
        productId: "prod_1",
        variantId: null,
        quantity: 2,
      },
    ],
    shippingAddress: validAddress,
    notes: "Please deliver before evening.",
  };

  it("accepts a completely valid checkout payload", () => {
    const result = checkoutOrderSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  it("rejects an empty item array", () => {
    const invalid = { ...validCheckout, items: [] };
    const result = checkoutOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("empty");
    }
  });

  it("rejects non-positive item quantities", () => {
    const invalid = {
      ...validCheckout,
      items: [{ productId: "p1", quantity: 0 }],
    };
    const result = checkoutOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates 10-digit Indian mobile numbers starting with 6-9", () => {
    // Valid phone numbers
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, phone: "9823456789" }).success
    ).toBe(true);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, phone: "7012345678" }).success
    ).toBe(true);

    // Invalid phone numbers
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, phone: "5123456789" }).success
    ).toBe(false);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, phone: "98765" }).success
    ).toBe(false);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, phone: "98765432100" }).success
    ).toBe(false);
  });

  it("validates 6-digit Indian postal pincodes starting with 1-9", () => {
    // Valid Indian pincodes
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, pincode: "110001" }).success
    ).toBe(true);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, pincode: "560001" }).success
    ).toBe(true);

    // Invalid pincodes (starts with 0, letters, length != 6)
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, pincode: "010001" }).success
    ).toBe(false);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, pincode: "11000A" }).success
    ).toBe(false);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, pincode: "1100" }).success
    ).toBe(false);
  });

  it("enforces valid email formatting", () => {
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, email: "invalid-email" }).success
    ).toBe(false);
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, email: "user@domain.com" }).success
    ).toBe(true);
  });

  describe("Direct UPI Payment Validation", () => {
    it("accepts valid 12-digit UPI UTR numbers", () => {
      const payload = {
        ...validCheckout,
        paymentMethod: "DIRECT_UPI",
        upiUtrNumber: "431289567012",
        upiScreenshotUrl: "https://res.cloudinary.com/fkhfggwt/image/upload/v1/receipt.png",
      };
      const res = checkoutOrderSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it("rejects invalid UTR numbers that are not 12 digits", () => {
      // 10 digits
      const invalidShort = {
        ...validCheckout,
        upiUtrNumber: "4312895670",
      };
      expect(checkoutOrderSchema.safeParse(invalidShort).success).toBe(false);

      // letters in UTR
      const invalidChars = {
        ...validCheckout,
        upiUtrNumber: "431289ABC012",
      };
      expect(checkoutOrderSchema.safeParse(invalidChars).success).toBe(false);
    });
  });

  describe("Razorpay Signature Cryptographic Verification", () => {
    const testSecret = "test_secret_key_12345";

    it("verifies an authentic HMAC-SHA256 signature when secret matches", () => {
      const orderId = "order_live_998877";
      const paymentId = "pay_live_112233";

      // Compute actual HMAC-SHA256
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder")
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const isValid = verifyRazorpaySignature({
        orderId,
        paymentId,
        signature: generatedSignature,
      });

      expect(isValid).toBe(true);
    });

    it("rejects forged or tampered payment signatures", () => {
      const orderId = "order_live_998877";
      const paymentId = "pay_live_112233";
      const forgedSignature = "forged_signature_00000000000000000000000000000000000000000000000000";

      const isValid = verifyRazorpaySignature({
        orderId,
        paymentId,
        signature: forgedSignature,
      });

      expect(isValid).toBe(false);
    });

    it("returns false if any required parameter is missing", () => {
      expect(
        verifyRazorpaySignature({
          orderId: "",
          paymentId: "pay_123",
          signature: "sig_123",
        })
      ).toBe(false);
      expect(
        verifyRazorpaySignature({
          orderId: "order_123",
          paymentId: "",
          signature: "sig_123",
        })
      ).toBe(false);
    });
  });
});

