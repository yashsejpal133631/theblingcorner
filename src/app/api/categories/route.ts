import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_CATEGORIES = [
  { id: "cat_keychains", name: "Keychains", slug: "keychains", description: "Trendy aesthetic keychains, light lamps, and bells", displayOrder: 1, productCount: 4 },
  { id: "cat_hair_clips", name: "Hair clips", slug: "hair-clips", description: "Aesthetic pearl, character, and resin hair clips", displayOrder: 2, productCount: 4 },
  { id: "cat_stationery", name: "Stationery", slug: "stationery", description: "Cute diaries, gel pens, washi tapes, and sticky notes", displayOrder: 3, productCount: 3 },
  { id: "cat_bracelets", name: "Bracelets", slug: "bracelets", description: "Handcrafted glass bead, crystal, and custom charm bracelets", displayOrder: 4, productCount: 4 },
  { id: "cat_charms", name: "Charms", slug: "charms", description: "Phone charms, bag charms, and miniature cute charms", displayOrder: 5, productCount: 3 },
  { id: "cat_wipes", name: "Wipes", slug: "wipes", description: "Mini and can aesthetic pocket wipes", displayOrder: 6, productCount: 2 },
];

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      productCount: c._count.products,
    }));

    return NextResponse.json({ success: true, categories: formatted });
  } catch (error) {
    console.warn("[GET_CATEGORIES_FALLBACK] Serving seeded categories catalog:", error);
    return NextResponse.json({ success: true, categories: FALLBACK_CATEGORIES });
  }
}
