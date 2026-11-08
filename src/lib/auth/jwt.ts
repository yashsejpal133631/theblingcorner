import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  role: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN";
}

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "the-bling-corner-default-dev-secret-minimum-32-chars-long";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = "tbc_session";

/**
 * Creates a signed JWT session token valid for 7 days
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verifies a JWT session token and returns the decoded payload, or null if expired/tampered
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
