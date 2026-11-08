import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder";

/**
 * Creates an authorized order on Razorpay for online prepaid checkout
 */
export async function createRazorpayOrder(options: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; receipt: string }> {
  // If keys are test/placeholder, return a clean mock order structure for smooth dev testing
  if (
    !process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID === "rzp_test_YourTestKeyId" ||
    process.env.RAZORPAY_KEY_ID.includes("placeholder")
  ) {
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: options.amountPaise,
      currency: options.currency || "INR",
      receipt: options.receipt,
    };
  }

  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: options.amountPaise,
      currency: options.currency || "INR",
      receipt: options.receipt,
      notes: options.notes,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.description || "Failed to create Razorpay payment order.");
  }

  return response.json();
}

/**
 * Timing-safe HMAC SHA-256 verification of Razorpay payment signature
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  if (!orderId || !paymentId || !signature) return false;

  // In test/mock mode without live keys:
  if (
    orderId.startsWith("order_mock_") &&
    (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes("placeholder"))
  ) {
    return true;
  }

  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}

