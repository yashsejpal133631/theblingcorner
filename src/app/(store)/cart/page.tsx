"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { formatPrice } from "@/lib/utils";
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Truck,
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function CartPage() {
  const { items, itemCount, subtotal, totalWeightGrams, updateQuantity, removeItem, clearCart } =
    useCart();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 gap-2">
          <div>
            <Link
              href="/catalog"
              className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Continue Shopping
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Shopping Bag
            </h1>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-neutral-400 hover:text-red-600 transition-colors self-start sm:self-auto"
            >
              Clear Entire Bag
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-neutral-200/80 my-8 shadow-sm">
            <div className="h-20 w-20 rounded-full bg-rose-50 text-rose-900 flex items-center justify-center mb-4">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-1">
              Your Shopping Bag is Empty
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mb-6">
              Looks like you haven&apos;t added any items yet. Discover our cute keychains, phone charms, and beaded bracelets.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center px-6 py-3 rounded-2xl bg-rose-900 text-white text-sm font-bold hover:bg-rose-950 transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Explore Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
            {/* Left Items Column (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100 overflow-hidden shadow-sm">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Thumbnail */}
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                      <Image
                        src={item.imageUrl || "/images/placeholder.jpg"}
                        alt={item.title}
                        fill
                        className="object-cover object-center"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          className="text-sm sm:text-base font-bold text-neutral-900 hover:text-rose-900 transition-colors line-clamp-1"
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
                        <p className="text-xs text-neutral-500">{item.variantTitle}</p>
                      )}

                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-bold text-neutral-900">{formatPrice(item.price)}</span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-500 font-medium">{item.weightGrams}g each</span>
                      </div>

                      {/* Quantity & Total */}
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 text-neutral-600 hover:text-neutral-900"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-10 text-center text-xs sm:text-sm font-bold text-neutral-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stockQuantity}
                            className="p-2 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="text-sm sm:text-base font-black text-neutral-900">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Summary Column (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-sm sticky top-24">
                <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  Order Summary
                </h2>

                {/* Parcel Weight Calculation Badge */}
                <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                    <span className="flex items-center">
                      <Truck className="h-4 w-4 text-rose-900 mr-1.5" /> Total Weight:
                    </span>
                    <span>{totalWeightGrams}g</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Accurate courier delivery charges are calculated at checkout based on weight and your pincode.
                  </p>
                </div>

                {/* Subtotal Breakdown */}
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Items Total ({itemCount})</span>
                    <span className="font-semibold text-neutral-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Estimated Shipping</span>
                    <span className="text-neutral-500 text-xs italic">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-900">Subtotal</span>
                  <span className="text-lg sm:text-xl font-black text-rose-950">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {/* Checkout CTA */}
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-rose-900 text-white text-sm font-bold hover:bg-rose-950 transition-all shadow-sm active:scale-98"
                >
                  Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                {/* Trust Points */}
                <div className="border-t border-neutral-100 pt-4 space-y-2 text-xs text-neutral-500">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                    <span>100% Secure Prepaid Payment (UPI / Cards)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-rose-900" />
                    <span>Quality Checked & Hand-Packaged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

