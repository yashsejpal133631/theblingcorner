import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin required." },
        { status: 403 }
      );
    }

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        details: l.details ? JSON.stringify(l.details) : null,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("[ADMIN_AUDIT_LOGS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}
