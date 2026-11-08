"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { InstagramIcon } from "@/components/ui/icons";
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "TBC-ORDER";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      {/* Animated Success Badge */}
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-50">
        <CheckCircle2 className="w-12 h-12 stroke-[2.2]" />
      </div>

      <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 text-xs font-semibold uppercase tracking-wider rounded-full mb-3 border border-rose-200">
        Payment Verified & Order Confirmed
      </span>

      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 tracking-tight">
        Thank You for Your Order!
      </h1>
      <p className="mt-2 text-base text-neutral-600 max-w-md mx-auto">
        Your handcrafted pieces from <span className="font-semibold text-rose-950">The Bling Corner</span> are now being prepared with love and care.
      </p>

      {/* Order Reference Card */}
      <div className="mt-8 bg-white border border-rose-100 rounded-2xl p-6 sm:p-8 text-left shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Order Reference</p>
            <p className="text-xl font-mono font-bold text-rose-950 mt-0.5">{orderNumber}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            100% Prepaid via Razorpay
          </div>
        </div>

        {/* Fulfillment Timeline */}
        <div className="py-6 space-y-4">
          <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            What Happens Next?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/60">
              <PackageCheck className="w-5 h-5 text-rose-700 mb-2" />
              <p className="text-xs font-bold text-neutral-800">1. Handcrafted Prep</p>
              <p className="text-xs text-neutral-600 mt-1">
                Your jewelry & accessories are inspected, sanitized, and carefully packaged.
              </p>
            </div>
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/60">
              <Truck className="w-5 h-5 text-rose-700 mb-2" />
              <p className="text-xs font-bold text-neutral-800">2. Dispatched</p>
              <p className="text-xs text-neutral-600 mt-1">
                Handed to our courier partners. Tracking ID will be generated.
              </p>
            </div>
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/60">
              <ShieldCheck className="w-5 h-5 text-rose-700 mb-2" />
              <p className="text-xs font-bold text-neutral-800">3. Safe Delivery</p>
              <p className="text-xs text-neutral-600 mt-1">
                Delivered safely to your doorstep with tracking notifications.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/track-order?orderNumber=${encodeURIComponent(orderNumber)}`}
            className="flex-1"
          >
            <Button
              variant="outline"
              className="w-full h-11 border-rose-200 text-rose-950 hover:bg-rose-50 font-medium rounded-xl gap-2 text-sm"
            >
              <Truck className="w-4 h-4" />
              Track This Order
            </Button>
          </Link>
          <Link href="/catalog" className="flex-1">
            <Button className="w-full h-11 bg-rose-900 hover:bg-rose-950 text-white font-medium rounded-xl gap-2 text-sm">
              <ShoppingBag className="w-4 h-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>

      {/* Community / Social connect */}
      <div className="mt-8 bg-neutral-50 rounded-2xl p-5 border border-neutral-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Tag us when your parcel arrives!</h3>
          <p className="text-xs text-neutral-600 mt-0.5">
            Share unboxing stories on Instagram and tag <span className="font-semibold text-rose-800">@theblingcorner_</span> for a feature & special discount!
          </p>
        </div>
        <a
          href="https://www.instagram.com/theblingcorner_?mdxt=MWVlbXJ5dDA3dGhwOA%3D%3D"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white text-xs font-medium rounded-full shadow-sm hover:opacity-95 shrink-0"
        >
          <InstagramIcon className="w-4 h-4 fill-white" />
          <span>Follow @theblingcorner_</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </a>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-rose-50/20">
      <Navbar />
      <main className="flex-1">
        <React.Suspense
          fallback={
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
              <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-800 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">Loading order details...</p>
            </div>
          }
        >
          <OrderSuccessContent />
        </React.Suspense>
      </main>
      <Footer />
    </div>
  );
}

