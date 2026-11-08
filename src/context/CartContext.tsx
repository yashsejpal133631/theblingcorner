"use client";

import * as React from "react";

export interface CartItem {
  id: string; // unique item key: productId or `${productId}_${variantId}`
  productId: string;
  variantId?: string | null;
  variantTitle?: string | null;
  title: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  imageUrl?: string;
  quantity: number;
  weightGrams: number;
  stockQuantity: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  totalWeightGrams: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "tbc_cart_items_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // 1. Safe localStorage hydration on mount (prevents SSR hydration mismatch)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load cart from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Persist to localStorage on change
  React.useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn("Failed to save cart to localStorage:", e);
      }
    }
  }, [items, isHydrated]);

  // Generate unique item identifier based on product and variant
  const getItemKey = (productId: string, variantId?: string | null) => {
    return variantId ? `${productId}_${variantId}` : productId;
  };

  const addItem = React.useCallback((newItem: Omit<CartItem, "id">) => {
    const id = getItemKey(newItem.productId, newItem.variantId);

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === id);

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = Math.min(
          existing.quantity + newItem.quantity,
          existing.stockQuantity
        );
        updated[existingIndex] = { ...existing, quantity: newQty };
        return updated;
      }

      // Add fresh item capped by stock
      const initialQty = Math.min(Math.max(1, newItem.quantity), newItem.stockQuantity);
      return [...prev, { ...newItem, id, quantity: initialQty }];
    });

    setIsOpen(true);
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = React.useCallback((id: string, newQty: number) => {
    if (newQty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const clampedQty = Math.min(newQty, item.stockQuantity);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  const openCart = React.useCallback(() => setIsOpen(true), []);
  const closeCart = React.useCallback(() => setIsOpen(false), []);
  const toggleCart = React.useCallback(() => setIsOpen((prev) => !prev), []);

  // Aggregated calculations
  const itemCount = React.useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = React.useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const totalWeightGrams = React.useMemo(() => {
    return items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
  }, [items]);

  const value = React.useMemo(
    () => ({
      items,
      isOpen,
      itemCount,
      subtotal,
      totalWeightGrams,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    }),
    [
      items,
      isOpen,
      itemCount,
      subtotal,
      totalWeightGrams,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

