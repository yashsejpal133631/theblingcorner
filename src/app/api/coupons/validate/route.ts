import { NextRequest, NextResponse } from "next/server";

interface CouponRule {
  code: string;
  type: "PERCENT" | "FLAT" | "FREE_SHIPPING";
  value: number; // percentage (e.g. 10) or flat amount in INR (e.g. 50)
  minOrderValue?: number;
  maxDiscount?: number;
  description: string;
}

const AVAILABLE_COUPONS: Record<string, CouponRule> = {
  WELCOME10: {
    code: "WELCOME10",
    type: "PERCENT",
    value: 10,
    minOrderValue: 199,
    maxDiscount: 150,
    description: "10% OFF on your handcrafted order (Min. ₹199)",
  },
  BLING50: {
    code: "BLING50",
    type: "FLAT",
    value: 50,
    minOrderValue: 399,
    description: "Flat ₹50 OFF on orders above ₹399",
  },
  SPARKLE100: {
    code: "SPARKLE100",
    type: "FLAT",
    value: 100,
    minOrderValue: 799,
    description: "Flat ₹100 OFF on orders above ₹799",
  },
  FREESHIP: {
    code: "FREESHIP",
    type: "FREE_SHIPPING",
    value: 0,
    minOrderValue: 499,
    description: "Free delivery on orders above ₹499",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawCode = (body.code || "").trim().toUpperCase();
    const subtotal = Number(body.subtotal || 0);
    const shippingFee = Number(body.shippingFee || 0);

    if (!rawCode) {
      return NextResponse.json(
        { valid: false, error: "Please enter a coupon code." },
        { status: 400 }
      );
    }

    const coupon = AVAILABLE_COUPONS[rawCode];
    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: "Invalid coupon code. Try WELCOME10 or BLING50!" },
        { status: 404 }
      );
    }

    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return NextResponse.json(
        {
          valid: false,
          error: `Add items worth ₹${(coupon.minOrderValue - subtotal).toFixed(0)} more to unlock this coupon! (Min cart: ₹${coupon.minOrderValue})`,
        },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (coupon.type === "PERCENT") {
      discountAmount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.type === "FLAT") {
      discountAmount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      discountAmount = shippingFee;
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountAmount: Math.round(discountAmount * 100) / 100,
        description: coupon.description,
        type: coupon.type,
      },
    });
  } catch (error) {
    console.error("[COUPON_VALIDATE_ERROR]", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon code." },
      { status: 500 }
    );
  }
}

