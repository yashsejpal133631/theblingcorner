import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, "login", 10, 60 * 1000);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const firstError =
        validation.error.issues[0]?.message || "Invalid login credentials.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        phone: true,
      },
    });

    // Google-only accounts have no password hash and must not be able to log in
    // with an arbitrary password.
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        resource: "AUTH",
        details: { method: "password" },
      },
    }).catch(() => undefined);

    return response;
  } catch (error) {
    console.error("[POST_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
