"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { useWishlist, type WishlistItem } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlist();
  const { addItem, openCart } = useCart();

  const handleMoveToCart = (item: WishlistItem) => {
    addItem({
      productId: item.id,
      title: item.title,
      slug: item.slug,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
      weightGrams: item.weightGrams ?? 150,
      stockQuantity: item.stockQuantity ?? 1,
    });
    removeItem(item.id);
    openCart();
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-200/80">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3 py-0.5 text-xs font-semibold text-rose-900 shadow-2xs mb-1">
              <Heart className="h-3 w-3 fill-rose-900 text-rose-900" />
              <span>Your Saved Sparkles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-serif">
              My Wishlist ({items.length})
            </h1>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="self-start sm:self-auto text-xs text-neutral-500 hover:text-red-600 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center space-y-4 max-w-md mx-auto my-8 shadow-sm">
            <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center mx-auto">
              <Heart className="h-7 w-7 text-rose-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-900 font-serif">Your Wishlist is Empty</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Tap the little heart on any keychain, bracelet, or charm to save it here for later!
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/catalog"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-rose-900 text-white text-xs sm:text-sm font-bold hover:bg-rose-950 transition-colors shadow-xs"
              >
                Discover Handcrafted Items <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-2xs flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-3">
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 border border-neutral-100">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 hover:bg-red-50 text-neutral-400 hover:text-red-600 flex items-center justify-center transition-colors shadow-xs"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-rose-900 transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs font-extrabold text-neutral-900 pt-1 font-serif">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                  <button
                    onClick={() => handleMoveToCart(item)}
                    className="flex-1 inline-flex items-center justify-center py-2 px-3 rounded-xl bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs shadow-2xs transition-colors"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Move to Bag
                  </button>
                  <Link
                    href={`/product/${item.slug}`}
                    className="inline-flex items-center justify-center py-2 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
