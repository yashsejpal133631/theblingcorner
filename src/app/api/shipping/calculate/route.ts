import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolvePincodeZone, calculateShippingFee } from "@/lib/shipping";

const shippingQuerySchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, { message: "Please provide a valid 6-digit Indian postal pincode." }),
  weightGrams: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const validation = shippingQuerySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid pincode." },
        { status: 400 }
      );
    }

    const { pincode, items } = validation.data;
    let totalWeight = validation.data.weightGrams || 0;

    // If items are provided, calculate exact authoritative weight from database
    if (items && items.length > 0) {
      const productIds = items.map((i) => i.productId);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, weightGrams: true },
      });

      const weightMap = new Map(dbProducts.map((p) => [p.id, p.weightGrams]));
      totalWeight = items.reduce((sum, item) => {
        const itemWeight = weightMap.get(item.productId) || 150;
        return sum + itemWeight * item.quantity;
      }, 0);
    }

    // Default minimum weight is 150g (standard jewelry parcel)
    const finalWeight = Math.max(150, totalWeight);

    // Resolve Zone & Calculate Fee from client's chart
    const { zone, state, city, estimatedDays } = resolvePincodeZone(pincode);
    const fee = calculateShippingFee(finalWeight, zone);

    return NextResponse.json({
      success: true,
      pincode,
      zone,
      state,
      city,
      weightGrams: finalWeight,
      shippingFee: fee,
      estimatedDeliveryDays: estimatedDays,
    });
  } catch (error) {
    console.error("[SHIPPING_CALCULATION_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to calculate courier delivery charges." },
      { status: 500 }
    );
  }
}

