import { describe, it, expect } from "vitest";
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

function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 5.0;
  const sum = ratings.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / ratings.length).toFixed(1));
}

describe("Module 8: Customer Reviews & Quality Ratings", () => {
  it("accepts valid review submissions with ratings between 1 and 5", () => {
    for (let rating = 1; rating <= 5; rating++) {
      const valid = {
        productId: "prod_1",
        rating,
        comment: "Beautiful handcrafted jewelry, high quality beads!",
      };
      expect(createReviewSchema.safeParse(valid).success).toBe(true);
    }
  });

  it("rejects ratings outside the 1-5 boundary", () => {
    expect(
      createReviewSchema.safeParse({ productId: "p1", rating: 0, comment: "test" }).success
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ productId: "p1", rating: 6, comment: "test" }).success
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ productId: "p1", rating: -1, comment: "test" }).success
    ).toBe(false);
  });

  it("enforces comment length constraints (3 to 500 characters)", () => {
    expect(
      createReviewSchema.safeParse({ productId: "p1", rating: 5, comment: "hi" }).success
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({
        productId: "p1",
        rating: 5,
        comment: "a".repeat(501),
      }).success
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({
        productId: "p1",
        rating: 5,
        comment: "Great quality!",
      }).success
    ).toBe(true);
  });

  it("calculates accurate arithmetic average ratings", () => {
    expect(calculateAverageRating([])).toBe(5.0);
    expect(calculateAverageRating([5, 5, 5])).toBe(5.0);
    expect(calculateAverageRating([5, 4, 5, 5, 4])).toBe(4.6);
    expect(calculateAverageRating([1, 2, 3, 4, 5])).toBe(3.0);
  });
});

