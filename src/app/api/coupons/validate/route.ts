import { NextRequest, NextResponse } from "next/server";
import { validateCouponCode } from "@/lib/coupons";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawCode = body.code || "";
    const subtotal = Number(body.subtotal || 0);
    const shippingFee = Number(body.shippingFee || 0);

    const result = await validateCouponCode(rawCode, subtotal, shippingFee);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      coupon: result.coupon,
    });
  } catch (error) {
    console.error("[COUPON_VALIDATE_ERROR]", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon code." },
      { status: 500 }
    );
  }
}
