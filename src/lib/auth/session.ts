import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, SessionPayload } from "./jwt";

/**
 * Retrieves the currently authenticated session in a Server Component or Route Handler
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Returns standard cookie configuration options for session tokens
 */
export function getSessionCookieOptions() {
  const isLocal =
    process.env.NEXTAUTH_URL?.includes("localhost") ||
    process.env.NEXT_PUBLIC_APP_URL?.includes("localhost");
  const isProd = process.env.NODE_ENV === "production" && !isLocal;

  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}
