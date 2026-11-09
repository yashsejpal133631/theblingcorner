import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit, jsonError, rejectCrossOrigin } from "@/lib/http";
import { z } from "zod";

const createReviewSchema = z.object({
  productId: z.string().min(1, { message: "Product ID is required." }),
  rating: z.number().int().min(1).max(5, { message: "Rating must be between 1 and 5 stars." }),
  comment: z
    .string()
    .trim()
    .min(3, { message: "Review comment must be at least 3 characters." })
    .max(500, { message: "Review cannot exceed 500 characters." }),
});

async function hasDeliveredPurchase(
  userId: string,
  productId: string
): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: "DELIVERED",
      },
    },
    select: { id: true },
  });
  return Boolean(item);
}

/**
 * GET /api/reviews?productId=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return jsonError("Product ID is required.", 400);
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const averageRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((acc, curr) => acc + curr.rating, 0) /
              reviews.length
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        authorName: r.user?.name || "Verified Buyer",
        isVerified: r.isVerified,
        createdAt: r.createdAt,
      })),
      totalReviews: reviews.length,
      averageRating,
    });
  } catch (error) {
    console.error("[GET_REVIEWS_ERROR]", error);
    return jsonError("Failed to load reviews.", 500);
  }
}

/**
 * POST /api/reviews
 */
export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(request, "review_create", 5, 10 * 60 * 1000);
  if (rateLimited) return rateLimited;

  try {
    const session = await getSession();
    if (!session) {
      return jsonError("Please log in to leave a review.", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message || "Invalid review data.",
        400
      );
    }

    const { productId, rating, comment } = parsed.data;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });
    if (!product || !product.isActive) {
      return jsonError("Product not found.", 404);
    }

    const existing = await prisma.review.findFirst({
      where: { productId, userId: session.userId },
      select: { id: true },
    });
    if (existing) {
      return jsonError("You have already reviewed this product.", 409);
    }

    const isVerified = await hasDeliveredPurchase(session.userId, productId);

    const review = await prisma.review.create({
      data: {
        productId,
        userId: session.userId,
        rating,
        comment,
        isVerified,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for your review!",
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          authorName: review.user?.name || "Verified Buyer",
          isVerified: review.isVerified,
          createdAt: review.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST_REVIEW_ERROR]", error);
    return jsonError("Failed to submit review.", 500);
  }
}
