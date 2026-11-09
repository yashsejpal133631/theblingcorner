import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  enforceRateLimit,
  getClientIp,
  jsonError,
  rejectCrossOrigin,
} from "@/lib/http";
import {
  rejectUpiPayment,
  UpiVerificationError,
} from "@/lib/payments/upi";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { message: "Please provide a rejection reason." })
    .max(300),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(
    request,
    "admin_upi_reject",
    30,
    60 * 1000
  );
  if (rateLimited) return rateLimited;

  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")
    ) {
      return jsonError("Unauthorized access.", 403);
    }

    const { id } = await params;
    if (!id) return jsonError("Payment id is required.", 400);

    const body = await request.json().catch(() => null);
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message || "Please provide a rejection reason.",
        400
      );
    }

    const result = await rejectUpiPayment({
      paymentId: id,
      adminUserId: session.userId,
      adminEmail: session.email,
      reason: parsed.data.reason,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: result.alreadyProcessed
        ? `Order ${result.orderNumber} was already rejected.`
        : `Payment rejected. Order ${result.orderNumber} was cancelled and reserved stock released.`,
      ...result,
    });
  } catch (error) {
    if (error instanceof UpiVerificationError) {
      return jsonError(error.message, error.status);
    }
    console.error("[ADMIN_UPI_REJECT_ERROR]", error);
    return jsonError("Failed to reject payment.", 500);
  }
}
