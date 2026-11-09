import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { jsonError, rejectCrossOrigin } from "@/lib/http";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const search = searchParams.get("search")?.trim().toLowerCase();
  const sort = searchParams.get("sort") || "featured";
  const inStock = searchParams.get("inStock") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const skip = (page - 1) * limit;

  try {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (categorySlug && categorySlug !== "all") {
      where.category = { slug: categorySlug };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (inStock) {
      where.stockQuantity = { gt: 0 };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };
    else if (sort === "featured") orderBy = { isFeatured: "desc" };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map((product) => ({
        ...product,
        thumbnailUrl: product.images[0]?.url || null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET_PRODUCTS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to load products." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["VENDOR", "SUPER_ADMIN"])) {
      return jsonError(
        "Unauthorized. Store owner or admin access required.",
        403
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonError("Invalid JSON request body.", 400);
    }

    const validation = productSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "Invalid product data.",
        400
      );
    }

    const {
      title,
      description,
      price,
      comparePrice,
      weightGrams,
      stockQuantity,
      categoryId,
      sku,
      isFeatured,
      isActive,
      images,
      variants,
    } = validation.data;

    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    try {
      const product = await prisma.product.create({
        data: {
          title,
          slug,
          description,
          price,
          comparePrice: comparePrice || null,
          weightGrams,
          stockQuantity,
          sku: sku || null,
          isFeatured,
          isActive,
          categoryId,
          images: {
            create: images.map((url, index) => ({
              url,
              isPrimary: index === 0,
              sortOrder: index,
            })),
          },
          variants: {
            create: (variants || []).map((v) => ({
              title: v.title,
              price: v.price || null,
              stock: v.stock,
              sku: v.sku || null,
            })),
          },
        },
        include: {
          category: true,
          images: true,
          variants: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          product: {
            ...product,
            thumbnailUrl: product.images[0]?.url || null,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return jsonError(
          "A product with this slug or SKU already exists.",
          409
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[POST_PRODUCT_ERROR]", error);
    return jsonError("Failed to create product.", 500);
  }
}
