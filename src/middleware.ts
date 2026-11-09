import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy tuned for this store:
 * - Next.js injects inline bootstrap scripts/styles, so 'unsafe-inline' is
 *   required for scripts/styles.
 * - Razorpay checkout, Firebase Auth and Google Identity are the only external
 *   script/frame origins needed.
 * - Product images and receipts live on Cloudinary/Supabase/Unsplash over https.
 * Development additionally needs eval and websocket connections.
 */
function buildCsp(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://checkout.razorpay.com",
    "https://www.gstatic.com",
    "https://apis.google.com",
    "https://www.googletagmanager.com",
  ].join(" ");

  const connectSrc = [
    "'self'",
    ...(isDev ? ["ws:", "wss:"] : []),
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://www.googleapis.com",
    "https://*.supabase.co",
    "https://*.cloudinary.com",
    "https://*.firebaseio.com",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://checkout.razorpay.com https://*.firebaseapp.com https://accounts.google.com",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups"
  );
  response.headers.set("Content-Security-Policy", buildCsp());

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 1. Role Authorization for Super Admin Master Routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (session.role !== "SUPER_ADMIN") {
      const unauthorizedUrl = new URL("/", request.url);
      unauthorizedUrl.searchParams.set("error", "unauthorized_admin_access");
      return withSecurityHeaders(NextResponse.redirect(unauthorizedUrl));
    }
  }

  // 2. Role Authorization for Client Vendor Routes (/vendor/*)
  if (pathname.startsWith("/vendor")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN") {
      const unauthorizedUrl = new URL("/", request.url);
      unauthorizedUrl.searchParams.set("error", "unauthorized_vendor_access");
      return withSecurityHeaders(NextResponse.redirect(unauthorizedUrl));
    }
  }

  // 3. Prevent logged-in users from seeing login/register again
  if ((pathname === "/login" || pathname === "/register") && session) {
    if (session.role === "SUPER_ADMIN") {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/admin", request.url))
      );
    }
    if (session.role === "VENDOR") {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/vendor", request.url))
      );
    }
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/", request.url))
    );
  }

  // 4. Inject OWASP Security Headers into all passing responses
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images, icons (public folder assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|chart.jpeg|Screenshot).*)",
  ],
};
