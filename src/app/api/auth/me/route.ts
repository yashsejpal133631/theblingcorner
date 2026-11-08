import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    let user: any = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          image: true,
        },
      });
    } catch (dbErr) {
      console.warn("DB user lookup in /api/auth/me fallback:", dbErr);
    }

    return NextResponse.json({
      authenticated: true,
      user: user || {
        id: session.userId,
        name: session.name || (session.role === "SUPER_ADMIN" ? "Master Admin" : "Store Owner"),
        email: session.email,
        role: session.role,
      },
    });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch active session details." },
      { status: 500 }
    );
  }
}
