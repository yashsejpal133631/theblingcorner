"use client";

import * as React from "react";

export interface WishlistItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  imageUrl: string;
  weightGrams: number;
  stockQuantity: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = React.createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("theblingcorner_wishlist");
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load wishlist from localStorage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("theblingcorner_wishlist", JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save wishlist to localStorage:", e);
    }
  }, [items, isLoaded]);

  const isInWishlist = React.useCallback(
    (productId: string) => items.some((i) => i.id === productId),
    [items]
  );

  const toggleWishlist = React.useCallback(
    (item: WishlistItem) => {
      setItems((prev) => {
        const exists = prev.some((i) => i.id === item.id);
        if (exists) {
          return prev.filter((i) => i.id !== item.id);
        } else {
          return [...prev, item];
        }
      });
    },
    []
  );

  const removeItem = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const clearWishlist = React.useCallback(() => {
    setItems([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        items,
        isInWishlist,
        toggleWishlist,
        removeItem,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = React.useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
