import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { toggleCouponActive, deleteCoupon, saveCoupon, getAllCoupons } from "@/lib/coupons";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { code } = await params;
    const body = await request.json();

    if (typeof body.isActive === "boolean") {
      const updated = await toggleCouponActive(code, body.isActive);
      if (!updated) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, coupon: updated });
    }

    // Full update if other fields passed
    const coupons = await getAllCoupons();
    const existing = coupons.find((c) => c.code === code.toUpperCase());
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const updated = await saveCoupon({
      ...existing,
      ...body,
      code: existing.code, // preserve code
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error) {
    console.error("[VENDOR_PATCH_COUPON_ERROR]", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "VENDOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { code } = await params;
    await deleteCoupon(code);

    return NextResponse.json({ success: true, message: `Coupon '${code}' deleted.` });
  } catch (error) {
    console.error("[VENDOR_DELETE_COUPON_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}

