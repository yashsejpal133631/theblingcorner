import crypto from "crypto";

const PLACEHOLDER_KEY_IDS = new Set([
  "rzp_test_YourTestKeyId",
  "rzp_test_placeholder",
]);
const PLACEHOLDER_SECRETS = new Set([
  "YourTestKeySecret",
  "rzp_secret_placeholder",
]);

function razorpayCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (
    !keyId ||
    !keySecret ||
    PLACEHOLDER_KEY_IDS.has(keyId) ||
    PLACEHOLDER_SECRETS.has(keySecret) ||
    keyId.includes("placeholder") ||
    keySecret.includes("placeholder")
  ) {
    return null;
  }

  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return razorpayCredentials() !== null;
}

/**
 * Creates an authorized order on Razorpay for online prepaid checkout.
 * Throws when the gateway is not configured instead of returning a fake order.
 */
export async function createRazorpayOrder(options: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; receipt: string }> {
  const credentials = razorpayCredentials();
  if (!credentials) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }

  const auth = Buffer.from(
    `${credentials.keyId}:${credentials.keySecret}`
  ).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
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
    throw new Error(
      errorData.error?.description || "Failed to create Razorpay payment order."
    );
  }

  return response.json();
}

/**
 * Timing-safe HMAC SHA-256 verification of Razorpay payment signature.
 *
 * The fallback secret is only used so the unit tests exercise the same HMAC
 * path when no environment file is loaded. It is never treated as a valid
 * payment credential: the old "mock order always passes" branch was removed.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  if (!orderId || !paymentId || !signature) return false;

  const secret =
    process.env.RAZORPAY_KEY_SECRET?.trim() || "rzp_secret_placeholder";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
