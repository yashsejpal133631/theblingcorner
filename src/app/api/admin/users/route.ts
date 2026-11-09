import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { rejectCrossOrigin } from "@/lib/http";
import { z } from "zod";

const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["CUSTOMER", "VENDOR", "SUPER_ADMIN"]),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin required." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        orders: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.name || "Customer",
        role: u.role,
        createdAt: u.createdAt,
        orderCount: u.orders.length,
      })),
    });
  } catch (error) {
    console.error("[ADMIN_USERS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateUserRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid role payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    if (userId === session.userId && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You cannot remove your own Super Admin access." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      const remainingAdmins = await prisma.user.count({
        where: { role: "SUPER_ADMIN", id: { not: userId } },
      });
      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: "At least one Super Admin must remain." },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { role },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "UPDATE_USER_ROLE",
          resource: "USER",
          details: {
            previousRole: target.role,
            newRole: role,
            targetUserId: userId,
            updatedBy: session.email,
          },
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("[ADMIN_UPDATE_ROLE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update role." },
      { status: 500 }
    );
  }
}
