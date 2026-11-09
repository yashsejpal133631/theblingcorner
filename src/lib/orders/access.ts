import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { getJwtSecret } from "@/lib/env";

const ORDER_ACCESS_PURPOSE = "order_access";
const ORDER_ACCESS_TTL = "7d";

function key(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

/**
 * Creates a short-lived signed token that grants read access to one order.
 * The checkout response includes this token so the success page can show the
 * real payment status without exposing order details to anyone who guesses an
 * order number.
 */
export async function createOrderAccessToken(orderNumber: string): Promise<string> {
  return new SignJWT({ orderNumber, purpose: ORDER_ACCESS_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ORDER_ACCESS_TTL)
    .sign(key());
}

export async function verifyOrderAccessToken(
  token: string | null | undefined,
  orderNumber: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return (
      payload.purpose === ORDER_ACCESS_PURPOSE &&
      payload.orderNumber === orderNumber
    );
  } catch {
    return false;
  }
}
