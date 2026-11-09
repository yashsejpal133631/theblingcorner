import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Best-effort client IP extraction. The hosting proxy is expected to set
 * `x-forwarded-for`; `x-real-ip` covers other common proxies.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

export function jsonError(
  message: string,
  status: number = 400,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * CSRF defence for cookie-authenticated / mutating routes.
 *
 * Browsers send `Origin` on cross-site POST/PATCH/DELETE requests. We accept a
 * request when its Origin (or Referer fallback) matches the request host.
 * `Sec-Fetch-Site: same-origin` is accepted as a browser-provided fallback.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const originHost = hostOf(request.headers.get("origin"));
  if (originHost) return originHost === host;

  const refererHost = hostOf(request.headers.get("referer"));
  if (refererHost) return refererHost === host;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") return true;

  return false;
}

export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  if (isSameOrigin(request)) return null;
  return jsonError("Cross-origin request blocked.", 403);
}

/**
 * Route-specific rate limit. Returns a 429 response when the caller exceeded
 * the allowed number of requests, or null when the request may continue.
 */
export function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${bucket}_${ip}`, limit, windowMs);
  if (result.success) return null;

  return NextResponse.json(
    {
      error: `Too many requests. Please wait ${result.resetInSec} seconds and try again.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.resetInSec) },
    }
  );
}
