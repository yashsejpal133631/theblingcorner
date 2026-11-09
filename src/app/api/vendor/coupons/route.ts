import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAllCoupons, saveCoupon } from "@/lib/coupons";
import { z } from "zod";

const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Coupon code must be at least 3 characters")
    .max(20, "Coupon code cannot exceed 20 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, and dashes"),
  type: z.enum(["PERCENT", "FLAT", "FREE_SHIPPING"]),
  value: z.number().min(0, "Discount value cannot be negative"),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  description: z.string().trim().max(120).optional(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const coupons = await getAllCoupons();
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    console.error("[VENDOR_GET_COUPONS_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid coupon data" },
        { status: 400 }
      );
    }

    const saved = await saveCoupon({
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      minOrderValue: parsed.data.minOrderValue,
      maxDiscount: parsed.data.maxDiscount,
      description: parsed.data.description || `${parsed.data.type === "PERCENT" ? `${parsed.data.value}% OFF` : `₹${parsed.data.value} OFF`}`,
      isActive: parsed.data.isActive,
      expiresAt: parsed.data.expiresAt || null,
    });

    return NextResponse.json({ success: true, coupon: saved }, { status: 201 });
  } catch (error) {
    console.error("[VENDOR_CREATE_COUPON_ERROR]", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

