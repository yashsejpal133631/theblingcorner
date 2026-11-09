import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { z } from "zod";

const googleAuthSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().nullable().optional(),
  image: z.string().url().nullable().optional(),
  idToken: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const parsed = googleAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Google authentication details." }, { status: 400 });
    }

    const { email, name, image } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    let user: {
      id: string;
      name: string | null;
      email: string;
      role: any;
      image: string | null;
    } | null = null;

    try {
      // Find existing user by email
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      });

      if (existingUser) {
        user = existingUser;
        // Update user avatar or name if newly provided
        if ((!existingUser.image && image) || (!existingUser.name && name)) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              ...(image && !existingUser.image ? { image } : {}),
              ...(name && !existingUser.name ? { name } : {}),
              emailVerified: new Date(),
            },
          });
        }
      } else {
        // Create new customer account via Google
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
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
        user = newUser;
      }
    } catch (dbErr) {
      console.warn("DB user find/create fallback in google auth:", dbErr);
      user = {
        id: `usr_google_${Date.now()}`,
        name: name || "Google Customer",
        email: normalizedEmail,
        role: "CUSTOMER",
        image: image || null,
      };
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to authenticate with Google." }, { status: 500 });
    }

    // Generate secure session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined,
    });

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    return NextResponse.json({
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
  } catch (error) {
    console.error("[GOOGLE_AUTH_ERROR]", error);
    return NextResponse.json(
      { error: "Google authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
