"use client";

import * as React from "react";
import { ProductCard, ProductCardProps } from "./ProductCard";
import { Sparkles, PackageOpen } from "lucide-react";

interface ProductGridProps {
  products: ProductCardProps["product"][];
  isLoading?: boolean;
  onAddToCart?: (productId: string) => void;
  onClearFilters?: () => void;
}

export function ProductGrid({
  products,
  isLoading = false,
  onAddToCart,
  onClearFilters,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden animate-pulse"
          >
            <div className="aspect-square w-full bg-neutral-100" />
            <div className="p-3 sm:p-4 space-y-2">
              <div className="h-3 w-1/3 bg-neutral-200 rounded" />
              <div className="h-4 w-3/4 bg-neutral-200 rounded" />
              <div className="h-4 w-1/2 bg-neutral-200 rounded pt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-neutral-200/80 my-4">
        <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-900 flex items-center justify-center mb-3">
          <PackageOpen className="h-7 w-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">
          No Products Found
        </h3>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mb-4">
          We couldn&apos;t find any items matching your current category or search criteria.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs sm:text-sm font-medium hover:bg-black transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> View All Items
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

