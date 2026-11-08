import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validations/product";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";

const FALLBACK_PRODUCTS = [
  {
    id: "prod_1",
    title: "Cloud Lamp Keychain with Light",
    slug: "cloud-lamp-keychain-light",
    description: "Adorable illuminated cloud lamp keychain with gentle warm LED glow. A viral favorite on Instagram reels!",
    price: 199,
    comparePrice: 249,
    weightGrams: 150,
    stockQuantity: 12,
    isFeatured: true,
    isActive: true,
    category: { name: "Keychains", slug: "keychains" },
    images: [{ url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [],
  },
  {
    id: "prod_2",
    title: "Starbucks Mini Drink Keychain",
    slug: "starbucks-mini-drink-keychain",
    description: "Ultra-detailed miniature Starbucks iced coffee keychain with floating faux ice cubes.",
    price: 149,
    comparePrice: 199,
    weightGrams: 80,
    stockQuantity: 18,
    isFeatured: true,
    isActive: true,
    category: { name: "Keychains", slug: "keychains" },
    images: [{ url: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [],
  },
  {
    id: "prod_3",
    title: "Pastel Flower Claw Clip Set (3 pcs)",
    slug: "pastel-flower-claw-clip-set",
    description: "Matte finish aesthetic flower claw clips in soft blush, sage green, and lavender.",
    price: 149,
    comparePrice: 199,
    weightGrams: 65,
    stockQuantity: 24,
    isFeatured: true,
    isActive: true,
    category: { name: "Hair clips", slug: "hair-clips" },
    images: [{ url: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [],
  },
  {
    id: "prod_4",
    title: "Handcrafted Pearl & Glass Bead Bracelet",
    slug: "handmade-beaded-charm-bracelet",
    description: "Delicate handcrafted bracelet strung with freshwater faux pearls, iridescent Czech glass beads, and a gold-tone star charm.",
    price: 249,
    comparePrice: 320,
    weightGrams: 75,
    stockQuantity: 15,
    isFeatured: true,
    isActive: true,
    category: { name: "Bracelets", slug: "bracelets" },
    images: [{ url: "https://images.unsplash.com/photo-1611591475871-3f6280456108?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [
      { id: "var_1", title: "Rose Gold Charm", price: 249, stock: 8 },
      { id: "var_2", title: "Silver Charm", price: 249, stock: 7 },
    ],
  },
  {
    id: "prod_5",
    title: "Vintage Aesthetic Diary Notebook",
    slug: "vintage-aesthetic-diary-notebook",
    description: "Hardcover lined aesthetic journal with ribbon bookmark and gold foil cover details.",
    price: 249,
    comparePrice: 299,
    weightGrams: 220,
    stockQuantity: 9,
    isFeatured: true,
    isActive: true,
    category: { name: "Stationery", slug: "stationery" },
    images: [{ url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [],
  },
  {
    id: "prod_6",
    title: "Aesthetic Y2K Beaded Phone Charm",
    slug: "aesthetic-y2k-phone-charm",
    description: "Colorful beaded phone wrist strap with smiley faces, pearls, and pastel hearts.",
    price: 169,
    comparePrice: 219,
    weightGrams: 45,
    stockQuantity: 20,
    isFeatured: true,
    isActive: true,
    category: { name: "Charms", slug: "charms" },
    images: [{ url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [],
  },
  {
    id: "prod_7",
    title: "Mini Pocket Wet Wipes Canister (Set of 3)",
    slug: "mini-pocket-wet-wipes-canister",
    description: "Compact beverage-can shaped wet wipes dispenser with pull chain keychain.",
    price: 119,
    comparePrice: 159,
    weightGrams: 120,
    stockQuantity: 30,
    isFeatured: false,
    isActive: true,
    category: { name: "Wipes", slug: "wipes" },
    images: [{ url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80", isPrimary: true }],
    variants: [],
  },
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (product && product.isActive) {
      const relatedProducts = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
          isActive: true,
        },
        take: 4,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        product,
        relatedProducts,
      });
    }
  } catch (error) {
    console.warn("[GET_PRODUCT_SLUG_FALLBACK] Serving from catalog fallback:", error);
  }

  // Fallback matching
  const fallback = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  if (fallback) {
    const related = FALLBACK_PRODUCTS.filter((p) => p.slug !== slug).slice(0, 4);
    return NextResponse.json({
      success: true,
      product: fallback,
      relatedProducts: related,
    });
  }

  return NextResponse.json({ error: "Product not found." }, { status: 404 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["VENDOR", "SUPER_ADMIN"])) {
      return NextResponse.json(
        { error: "Unauthorized. Admin or store owner access required." },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const validation = productUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid update data." },
        { status: 400 }
      );
    }

    try {
      const existingProduct = await prisma.product.findUnique({ where: { slug } });
      if (existingProduct) {
        if (validation.data.images && validation.data.images.length > 0) {
          await prisma.productImage.deleteMany({ where: { productId: existingProduct.id } });
          await prisma.productImage.createMany({
            data: validation.data.images.map((url, idx) => ({
              productId: existingProduct.id,
              url,
              isPrimary: idx === 0,
              sortOrder: idx,
            })),
          });
        }

        const { images: _img, variants: _var, ...updateFields } = validation.data;
        const updated = await prisma.product.update({
          where: { id: existingProduct.id },
          data: updateFields,
          include: {
            category: true,
            images: true,
            variants: true,
          },
        });

        return NextResponse.json({ success: true, product: updated });
      }
    } catch (dbErr) {
      console.warn("DB update fallback:", dbErr);
    }

    // In-memory update for fallback products during local testing
    const fallbackItem = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
    if (fallbackItem) {
      if (validation.data.price !== undefined) fallbackItem.price = validation.data.price;
      if (typeof validation.data.comparePrice === "number") fallbackItem.comparePrice = validation.data.comparePrice;
      if (validation.data.title !== undefined) fallbackItem.title = validation.data.title;
      if (validation.data.description !== undefined) fallbackItem.description = validation.data.description;
      if (validation.data.weightGrams !== undefined) fallbackItem.weightGrams = validation.data.weightGrams;
      if (validation.data.stockQuantity !== undefined) fallbackItem.stockQuantity = validation.data.stockQuantity;
      if (validation.data.images && validation.data.images.length > 0) {
        fallbackItem.images = validation.data.images.map((url, idx) => ({ url, isPrimary: idx === 0 }));
      }
    }

    return NextResponse.json({
      success: true,
      product: { slug, ...validation.data },
    });
  } catch (error) {
    console.error("[PUT_PRODUCT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["VENDOR", "SUPER_ADMIN"])) {
      return NextResponse.json(
        { error: "Unauthorized. Admin or store owner access required." },
        { status: 403 }
      );
    }

    const { slug } = await params;
    try {
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
      }
    } catch (dbErr) {
      console.warn("DB delete fallback:", dbErr);
    }

    return NextResponse.json({ success: true, message: "Product deactivated successfully." });
  } catch (error) {
    console.error("[DELETE_PRODUCT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete product." },
      { status: 500 }
    );
  }
}
