import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  enforceRateLimit,
  getClientIp,
  jsonError,
  rejectCrossOrigin,
} from "@/lib/http";
import {
  approveUpiPayment,
  UpiVerificationError,
} from "@/lib/payments/upi";
import { z } from "zod";

const approveSchema = z.object({
  note: z.string().trim().max(300).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(
    request,
    "admin_upi_approve",
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

    const body = await request.json().catch(() => ({}));
    const parsed = approveSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError("Invalid approval note.", 400);
    }

    const result = await approveUpiPayment({
      paymentId: id,
      adminUserId: session.userId,
      adminEmail: session.email,
      note: parsed.data.note,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: result.alreadyProcessed
        ? `Order ${result.orderNumber} was already approved.`
        : `Payment approved. Order ${result.orderNumber} is now PAID.`,
      ...result,
    });
  } catch (error) {
    if (error instanceof UpiVerificationError) {
      return jsonError(error.message, error.status);
    }
    console.error("[ADMIN_UPI_APPROVE_ERROR]", error);
    return jsonError("Failed to approve payment.", 500);
  }
}
