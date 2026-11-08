import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 1. Role Authorization for Super Admin Master Routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "SUPER_ADMIN") {
      // Forbidden: redirect to home with security notice
      const unauthorizedUrl = new URL("/", request.url);
      unauthorizedUrl.searchParams.set("error", "unauthorized_admin_access");
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 2. Role Authorization for Client Vendor Routes (/vendor/*)
  if (pathname.startsWith("/vendor")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN") {
      const unauthorizedUrl = new URL("/", request.url);
      unauthorizedUrl.searchParams.set("error", "unauthorized_vendor_access");
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 3. Prevent logged-in users from seeing login/register again
  if ((pathname === "/login" || pathname === "/register") && session) {
    if (session.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (session.role === "VENDOR") {
      return NextResponse.redirect(new URL("/vendor", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Inject OWASP Security Headers into all responses
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
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

