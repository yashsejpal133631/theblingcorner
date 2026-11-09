import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { getJwtSecret } from "@/lib/env";

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  role: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN";
}

export const AUTH_COOKIE_NAME = "tbc_session";

function key(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

/**
 * Creates a signed JWT session token valid for 7 days
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

/**
 * Verifies a JWT session token and returns the decoded payload, or null if expired/tampered
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
