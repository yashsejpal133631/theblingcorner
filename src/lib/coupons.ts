import { prisma } from "@/lib/prisma";

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FLAT" | "FREE_SHIPPING";
  value: number; // percentage (e.g. 10) or flat amount in INR (e.g. 50)
  minOrderValue?: number;
  maxDiscount?: number;
  description: string;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

// Initial seed coupons (vendor can edit, toggle, or delete these at any time)
const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "c_welcome10",
    code: "WELCOME10",
    type: "PERCENT",
    value: 10,
    minOrderValue: 199,
    maxDiscount: 150,
    description: "10% OFF on your handcrafted order (Min. ₹199)",
    isActive: true,
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "c_bling50",
    code: "BLING50",
    type: "FLAT",
    value: 50,
    minOrderValue: 399,
    description: "Flat ₹50 OFF on orders above ₹399",
    isActive: true,
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "c_sparkle100",
    code: "SPARKLE100",
    type: "FLAT",
    value: 100,
    minOrderValue: 799,
    description: "Flat ₹100 OFF on orders above ₹799",
    isActive: true,
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "c_freeship",
    code: "FREESHIP",
    type: "FREE_SHIPPING",
    value: 0,
    minOrderValue: 499,
    description: "Free delivery on orders above ₹499",
    isActive: true,
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
];

// In-memory runtime cache for high-speed lookups and fallback when DB is cold
let inMemoryCoupons: Map<string, Coupon> = new Map(
  DEFAULT_COUPONS.map((c) => [c.code, c])
);

/**
 * Fetch all coupons from database (with fallback to memory)
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: "COUPON_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (logs.length > 0) {
      const dbCoupons: Coupon[] = [];
      for (const log of logs) {
        if (log.details && typeof log.details === "object") {
          const coupon = log.details as unknown as Coupon;
          if (coupon.code) {
            dbCoupons.push(coupon);
            inMemoryCoupons.set(coupon.code, coupon);
          }
        }
      }
      return dbCoupons;
    }
  } catch (err) {
    console.warn("[COUPONS_DB_FALLBACK] Using in-memory coupon store:", err);
  }

  return Array.from(inMemoryCoupons.values());
}

/**
 * Save or update a coupon
 */
export async function saveCoupon(coupon: Omit<Coupon, "id" | "createdAt"> & { id?: string }): Promise<Coupon> {
  const code = coupon.code.trim().toUpperCase();
  const existing = inMemoryCoupons.get(code);

  const fullCoupon: Coupon = {
    id: coupon.id || existing?.id || `cpn_${Date.now()}`,
    code,
    type: coupon.type,
    value: Number(coupon.value),
    minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : undefined,
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : undefined,
    description: coupon.description || `${coupon.type === "PERCENT" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}`,
    isActive: Boolean(coupon.isActive),
    expiresAt: coupon.expiresAt || null,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  inMemoryCoupons.set(code, fullCoupon);

  try {
    // Delete old audit log entry for this coupon code if it exists
    await prisma.auditLog.deleteMany({
      where: { action: "COUPON_CONFIG", resource: code },
    });

    // Write updated snapshot
    await prisma.auditLog.create({
      data: {
        action: "COUPON_CONFIG",
        resource: code,
        details: fullCoupon as any,
      },
    });
  } catch (err) {
    console.warn("[COUPON_SAVE_DB_WARN] Could not sync coupon to AuditLog DB:", err);
  }

  return fullCoupon;
}

/**
 * Toggle coupon active status (e.g. disable when festival is over)
 */
export async function toggleCouponActive(code: string, isActive: boolean): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  const coupons = await getAllCoupons();
  const found = coupons.find((c) => c.code === normalized);

  if (!found) return null;

  found.isActive = isActive;
  return saveCoupon(found);
}

/**
 * Delete a coupon permanently
 */
export async function deleteCoupon(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  inMemoryCoupons.delete(normalized);

  try {
    await prisma.auditLog.deleteMany({
      where: { action: "COUPON_CONFIG", resource: normalized },
    });
    return true;
  } catch (err) {
    console.warn("[COUPON_DELETE_DB_WARN] Could not delete coupon from AuditLog DB:", err);
    return true;
  }
}

/**
 * Validate a coupon at checkout
 */
export async function validateCouponCode(
  rawCode: string,
  subtotal: number,
  shippingFee: number = 0
): Promise<{
  valid: boolean;
  coupon?: {
    code: string;
    discountAmount: number;
    description: string;
    type: string;
  };
  error?: string;
}> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, error: "Please enter a coupon code." };
  }

  const coupons = await getAllCoupons();
  const coupon = coupons.find((c) => c.code === code);

  if (!coupon) {
    return {
      valid: false,
      error: "Invalid coupon code. Please check for spelling mistakes.",
    };
  }

  // 1. Check if vendor has disabled it
  if (!coupon.isActive) {
    return {
      valid: false,
      error: `Coupon '${coupon.code}' has ended or is currently paused by the store owner.`,
    };
  }

  // 2. Check if expired
  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt);
    if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      return {
        valid: false,
        error: `This festival coupon has expired on ${expiry.toLocaleDateString("en-IN")}.`,
      };
    }
  }

  // 3. Check minimum order value
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    const remaining = (coupon.minOrderValue - subtotal).toFixed(0);
    return {
      valid: false,
      error: `Add items worth ₹${remaining} more to unlock this coupon! (Minimum cart: ₹${coupon.minOrderValue})`,
    };
  }

  // 4. Calculate discount
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

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      discountAmount: Math.round(discountAmount * 100) / 100,
      description: coupon.description,
      type: coupon.type,
    },
  };
}
