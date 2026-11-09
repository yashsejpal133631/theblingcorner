import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { z } from "zod";

const googleAuthSchema = z.object({
  idToken: z.string().trim().min(20),
});

interface VerifiedGoogleUser {
  email: string;
  name: string | null;
  image: string | null;
}

/**
 * Verifies the Firebase ID token with Google's Identity Toolkit. The client
 * supplied email/name are never trusted: only the fields returned by Google for
 * this exact token are used.
 */
async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Firebase API key is not configured.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Google ID token could not be verified.");
  }

  const data = await response.json();
  const account = Array.isArray(data?.users) ? data.users[0] : null;

  if (!account || !account.email || account.emailVerified !== true) {
    throw new Error("Google account does not have a verified email address.");
  }

  if (account.disabled === true) {
    throw new Error("Google account is disabled.");
  }

  return {
    email: String(account.email).trim().toLowerCase(),
    name: account.displayName ? String(account.displayName) : null,
    image: account.photoUrl ? String(account.photoUrl) : null,
  };
}

export async function POST(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, "google_auth", 15, 60 * 1000);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => null);
    const parsed = googleAuthSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid Google authentication details.", 400);
    }

    let googleUser: VerifiedGoogleUser;
    try {
      googleUser = await verifyFirebaseIdToken(parsed.data.idToken);
    } catch (error) {
      console.warn(
        "[GOOGLE_AUTH_VERIFY_FAILED]",
        error instanceof Error ? error.message : error
      );
      return jsonError("Google sign-in could not be verified. Please try again.", 401);
    }

    const { email, name, image } = googleUser;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
    });

    let user: {
      id: string;
      name: string | null;
      email: string;
      role: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN";
      image: string | null;
    };

    if (existingUser) {
      const needsUpdate =
        (!existingUser.image && image) ||
        (!existingUser.name && name);

      user = needsUpdate
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              ...(image && !existingUser.image ? { image } : {}),
              ...(name && !existingUser.name ? { name } : {}),
              emailVerified: new Date(),
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
            },
          })
        : existingUser;
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: name || "Google User",
          image: image || null,
          role: "CUSTOMER",
          emailVerified: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: "Successfully signed in with Google.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        resource: "AUTH",
        details: { method: "google" },
      },
    }).catch(() => undefined);

    return response;
  } catch (error) {
    console.error("[GOOGLE_AUTH_ERROR]", error);
    return jsonError("Google authentication failed. Please try again.", 500);
  }
}
