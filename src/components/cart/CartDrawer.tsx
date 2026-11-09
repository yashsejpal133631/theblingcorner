"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import {
  X,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Truck,
  Sparkles,
} from "lucide-react";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    itemCount,
    subtotal,
    totalWeightGrams,
    updateQuantity,
    removeItem,
  } = useCart();

  // Close drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-900">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">Your Shopping Bag</h2>
              <span className="text-xs font-semibold text-neutral-400">({itemCount})</span>
            </div>
            <button
              onClick={closeCart}
              className="p-2 -mr-2 text-neutral-400 hover:text-neutral-700 transition-colors rounded-full"
              aria-label="Close bag"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-neutral-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-900 flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  Your bag is currently empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6">
                  Explore our handcrafted charms, aesthetic keychains, and beaded jewelry.
                </p>
                <Link
                  href="/catalog"
                  onClick={closeCart}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-rose-900 text-white text-xs font-bold hover:bg-rose-950 transition-colors shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2" /> Start Shopping
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-3 sm:gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.title}
                      fill
                      className="object-cover object-center"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={closeCart}
                        className="text-xs sm:text-sm font-semibold text-neutral-900 hover:text-rose-900 line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {item.variantTitle && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">{item.variantTitle}</p>
                    )}

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        ({item.weightGrams}g each)
                      </span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-neutral-200 rounded-lg bg-neutral-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQuantity}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-neutral-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="border-t border-neutral-100 bg-neutral-50/70 p-5 space-y-3">
              {/* Parcel Weight Info Banner */}
              <div className="flex items-center justify-between text-xs text-neutral-600 bg-white p-2.5 rounded-xl border border-neutral-200/80">
                <span className="flex items-center">
                  <Truck className="h-3.5 w-3.5 text-rose-900 mr-1.5" />
                  Total Parcel Weight:
                </span>
                <span className="font-bold text-neutral-900">{totalWeightGrams}g</span>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-500">Subtotal (Excl. Shipping)</span>
                  <span className="text-base sm:text-lg font-black text-neutral-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="text-xs font-semibold text-rose-900 hover:underline"
                >
                  View Full Cart &rarr;
                </Link>
              </div>

              {/* Checkout Button */}
              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-rose-900 text-white text-sm font-bold hover:bg-rose-950 transition-all shadow-sm active:scale-98"
              >
                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

