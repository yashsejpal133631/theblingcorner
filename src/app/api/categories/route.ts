import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    console.error("[GET_CATEGORIES_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to load categories." },
      { status: 500 }
    );
  }
}
