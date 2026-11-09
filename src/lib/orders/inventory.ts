import type { Prisma } from "@prisma/client";

export interface StockLine {
  productId: string;
  quantity: number;
  title: string;
}

export class OutOfStockError extends Error {
  readonly productTitle: string;
  readonly requested: number;
  readonly available: number;

  constructor(productTitle: string, requested: number, available: number) {
    super(
      `"${productTitle}" does not have enough stock. Requested ${requested}, available ${available}.`
    );
    this.name = "OutOfStockError";
    this.productTitle = productTitle;
    this.requested = requested;
    this.available = available;
  }
}

/**
 * Atomically reserves stock for every line.
 *
 * `updateMany` with a `stockQuantity >= quantity` predicate makes the check and
 * decrement a single SQL statement, so two concurrent checkouts cannot both
 * claim the last unit. If any line fails, the surrounding transaction rolls
 * back all earlier decrements.
 */
export async function decrementStock(
  tx: Prisma.TransactionClient,
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    const result = await tx.product.updateMany({
      where: {
        id: line.productId,
        stockQuantity: { gte: line.quantity },
      },
      data: {
        stockQuantity: { decrement: line.quantity },
      },
    });

    if (result.count !== 1) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
        select: { title: true, stockQuantity: true },
      });

      throw new OutOfStockError(
        product?.title || line.title,
        line.quantity,
        product?.stockQuantity ?? 0
      );
    }
  }
}

/**
 * Returns previously reserved stock. Called when an order is cancelled or a
 * UPI payment is rejected.
 */
export async function restock(
  tx: Prisma.TransactionClient,
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    await tx.product.update({
      where: { id: line.productId },
      data: { stockQuantity: { increment: line.quantity } },
    });
  }
}
