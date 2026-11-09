import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validations/product";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { jsonError, rejectCrossOrigin } from "@/lib/http";

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

    if (!product || !product.isActive) {
      return jsonError("Product not found.", 404);
    }

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
      product: {
        ...product,
        thumbnailUrl: product.images[0]?.url || null,
      },
      relatedProducts: relatedProducts.map((related) => ({
        ...related,
        thumbnailUrl: related.images[0]?.url || null,
      })),
    });
  } catch (error) {
    console.error("[GET_PRODUCT_SLUG_ERROR]", error);
    return jsonError("Failed to load product.", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["VENDOR", "SUPER_ADMIN"])) {
      return jsonError(
        "Unauthorized. Admin or store owner access required.",
        403
      );
    }

    const { slug } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonError("Invalid JSON request body.", 400);
    }

    const validation = productUpdateSchema.safeParse(body);
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "Invalid update data.",
        400
      );
    }

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (!existingProduct) {
      return jsonError("Product not found.", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validation.data.images && validation.data.images.length > 0) {
        await tx.productImage.deleteMany({
          where: { productId: existingProduct.id },
        });
        await tx.productImage.createMany({
          data: validation.data.images.map((url, idx) => ({
            productId: existingProduct.id,
            url,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        });
      }

      const { images: _images, variants: _variants, ...updateFields } =
        validation.data;

      return tx.product.update({
        where: { id: existingProduct.id },
        data: updateFields,
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      product: {
        ...updated,
        thumbnailUrl: updated.images[0]?.url || null,
      },
    });
  } catch (error) {
    console.error("[PUT_PRODUCT_ERROR]", error);
    return jsonError("Failed to update product.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["VENDOR", "SUPER_ADMIN"])) {
      return jsonError(
        "Unauthorized. Admin or store owner access required.",
        403
      );
    }

    const { slug } = await params;
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) {
      return jsonError("Product not found.", 404);
    }

    await prisma.product.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "PRODUCT_DEACTIVATED",
        resource: "PRODUCT",
        details: { slug, productId: existing.id },
      },
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: "Product deactivated successfully.",
    });
  } catch (error) {
    console.error("[DELETE_PRODUCT_ERROR]", error);
    return jsonError("Failed to delete product.", 500);
  }
}
