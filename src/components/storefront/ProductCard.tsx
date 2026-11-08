"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Sparkles } from "lucide-react";

export interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number | string;
    comparePrice?: number | string | null;
    stockQuantity: number;
    weightGrams?: number;
    category?: { name: string; slug: string };
    images?: Array<{ url: string; altText?: string | null }>;
  };
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { addItem } = useCart();
  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const comparePrice = product.comparePrice
    ? typeof product.comparePrice === "string"
      ? parseFloat(product.comparePrice)
      : product.comparePrice
    : null;

  const discountPercent =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = !isOutOfStock && product.stockQuantity <= 3;
  const imageUrl = product.images?.[0]?.url || "/images/placeholder.jpg";

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-neutral-200/80 overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Thumbnail Container */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-neutral-100"
      >
        {imageUrl.startsWith("http") || imageUrl.startsWith("/") ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-rose-50/50 text-rose-300">
            <Sparkles className="h-10 w-10" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountPercent && (
            <span className="rounded-full bg-rose-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
          {isLowStock && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              Only {product.stockQuantity} Left!
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Info Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.category && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            {product.category.name}
          </p>
        )}

        <Link
          href={`/product/${product.slug}`}
          className="text-xs sm:text-sm font-semibold text-neutral-900 line-clamp-2 hover:text-rose-900 transition-colors"
        >
          {product.title}
        </Link>

        {/* Price & Action */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-bold text-neutral-900">
              {formatPrice(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(comparePrice)}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              if (onAddToCart) {
                onAddToCart(product.id);
              } else {
                addItem({
                  productId: product.id,
                  title: product.title,
                  slug: product.slug,
                  price,
                  comparePrice,
                  imageUrl,
                  quantity: 1,
                  weightGrams: product.weightGrams || 150,
                  stockQuantity: product.stockQuantity,
                });
              }
            }}
            disabled={isOutOfStock}
            aria-label={`Add ${product.title} to cart`}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-rose-900 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

