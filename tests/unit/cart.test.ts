import { describe, it, expect } from "vitest";

// Pure cart calculation logic matching CartContext implementation
interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  title: string;
  price: number;
  quantity: number;
  weightGrams: number;
  stockQuantity: number;
}

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function calculateTotalWeight(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
}

function calculateItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function addItemLogic(prev: CartItem[], newItem: Omit<CartItem, "id">): CartItem[] {
  const id = newItem.variantId ? `${newItem.productId}_${newItem.variantId}` : newItem.productId;
  const existingIndex = prev.findIndex((i) => i.id === id);

  if (existingIndex > -1) {
    const updated = [...prev];
    const existing = updated[existingIndex];
    const newQty = Math.min(existing.quantity + newItem.quantity, existing.stockQuantity);
    updated[existingIndex] = { ...existing, quantity: newQty };
    return updated;
  }

  const initialQty = Math.min(Math.max(1, newItem.quantity), newItem.stockQuantity);
  return [...prev, { ...newItem, id, quantity: initialQty }];
}

function updateQuantityLogic(prev: CartItem[], id: string, newQty: number): CartItem[] {
  if (newQty <= 0) {
    return prev.filter((i) => i.id !== id);
  }
  return prev.map((item) => {
    if (item.id === id) {
      return { ...item, quantity: Math.min(newQty, item.stockQuantity) };
    }
    return item;
  });
}

describe("Module 3 - Shopping Cart & Dynamic Weight Aggregator Tests", () => {
  it("should add a new item and calculate initial totals correctly", () => {
    const items = addItemLogic([], {
      productId: "prod_1",
      title: "Cloud Lamp Keychain with Light",
      price: 199,
      quantity: 1,
      weightGrams: 150,
      stockQuantity: 10,
    });

    expect(items.length).toBe(1);
    expect(calculateItemCount(items)).toBe(1);
    expect(calculateSubtotal(items)).toBe(199);
    expect(calculateTotalWeight(items)).toBe(150);
  });

  it("should merge quantities when adding duplicate items", () => {
    let items = addItemLogic([], {
      productId: "prod_1",
      title: "Cloud Lamp Keychain with Light",
      price: 199,
      quantity: 2,
      weightGrams: 150,
      stockQuantity: 10,
    });

    items = addItemLogic(items, {
      productId: "prod_1",
      title: "Cloud Lamp Keychain with Light",
      price: 199,
      quantity: 3,
      weightGrams: 150,
      stockQuantity: 10,
    });

    expect(items.length).toBe(1);
    expect(calculateItemCount(items)).toBe(5);
    expect(calculateSubtotal(items)).toBe(199 * 5);
    expect(calculateTotalWeight(items)).toBe(150 * 5); // 750g
  });

  it("should cap quantity to available stock limit", () => {
    const items = addItemLogic([], {
      productId: "prod_low_stock",
      title: "Kuromi Hair Clip",
      price: 149,
      quantity: 10,
      weightGrams: 80,
      stockQuantity: 3, // only 3 in stock!
    });

    expect(items[0].quantity).toBe(3);
    expect(calculateTotalWeight(items)).toBe(240); // 3 * 80g
  });

  it("should distinguish different variants of the same product", () => {
    let items = addItemLogic([], {
      productId: "prod_charm",
      variantId: "blue_tulip",
      title: "Tulip Phone Charm (Blue)",
      price: 179,
      quantity: 1,
      weightGrams: 70,
      stockQuantity: 5,
    });

    items = addItemLogic(items, {
      productId: "prod_charm",
      variantId: "pink_tulip",
      title: "Tulip Phone Charm (Pink)",
      price: 179,
      quantity: 2,
      weightGrams: 70,
      stockQuantity: 5,
    });

    expect(items.length).toBe(2);
    expect(calculateItemCount(items)).toBe(3);
    expect(calculateSubtotal(items)).toBe(179 * 3);
    expect(calculateTotalWeight(items)).toBe(70 * 3); // 210g
  });

  it("should update quantity and remove item when quantity is reduced to 0", () => {
    let items = addItemLogic([], {
      productId: "prod_diary",
      title: "A5 Hardcover Aesthetic Diary",
      price: 299,
      quantity: 2,
      weightGrams: 350,
      stockQuantity: 5,
    });

    // Update to 3
    items = updateQuantityLogic(items, "prod_diary", 3);
    expect(items[0].quantity).toBe(3);
    expect(calculateTotalWeight(items)).toBe(1050); // 3 * 350g

    // Reduce to 0 -> should be removed
    items = updateQuantityLogic(items, "prod_diary", 0);
    expect(items.length).toBe(0);
    expect(calculateSubtotal(items)).toBe(0);
    expect(calculateTotalWeight(items)).toBe(0);
  });

  it("should correctly aggregate multi-item cart parcel weight for courier slabs", () => {
    let items: CartItem[] = [];

    // 2 Keychains (150g each = 300g)
    items = addItemLogic(items, {
      productId: "keychain_1",
      title: "Cloud Lamp",
      price: 199,
      quantity: 2,
      weightGrams: 150,
      stockQuantity: 10,
    });

    // 1 Diary (350g)
    items = addItemLogic(items, {
      productId: "diary_1",
      title: "A5 Diary",
      price: 299,
      quantity: 1,
      weightGrams: 350,
      stockQuantity: 10,
    });

    // 3 Hair clips (80g each = 240g)
    items = addItemLogic(items, {
      productId: "clip_1",
      title: "Kuromi Clip",
      price: 149,
      quantity: 3,
      weightGrams: 80,
      stockQuantity: 10,
    });

    // Total weight = 300 + 350 + 240 = 890g (falls into 501g-1000g courier slab!)
    const totalWeight = calculateTotalWeight(items);
    expect(totalWeight).toBe(890);

    // Subtotal = (199 * 2) + (299 * 1) + (149 * 3) = 398 + 299 + 447 = 1144
    const subtotal = calculateSubtotal(items);
    expect(subtotal).toBe(1144);
  });
});

