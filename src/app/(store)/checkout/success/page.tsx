"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { InstagramIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react";

interface SuccessOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  upiUtrLast4: string | null;
  items: Array<{ id: string; title: string; quantity: number; totalPrice: number }>;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "";
  const token = searchParams.get("token") || "";

  const [order, setOrder] = React.useState<SuccessOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(orderNumber));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orderNumber) {
      setError("We could not find an order reference in this link.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrder() {
      try {
        const query = new URLSearchParams();
        if (token) query.set("token", token);
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}?${query.toString()}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(
            data.error ||
              "We could not load this order. Use the tracking page with the phone or email used at checkout."
          );
          return;
        }
        setOrder(data.order);
      } catch {
        if (!cancelled) {
          setError(
            "Network error while loading your order. You can still track it with your phone or email."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadOrder();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, token]);

  const isConfirmed =
    order?.paymentStatus === "SUCCESS" ||
    order?.status === "PAID" ||
    order?.status === "PROCESSING" ||
    order?.status === "PACKED" ||
    order?.status === "SHIPPED" ||
    order?.status === "DELIVERED";
  const isCancelled = order?.status === "CANCELLED";
  const isAwaitingVerification =
    !isConfirmed && !isCancelled && order?.paymentStatus === "PENDING_VERIFICATION";

  const trackHref = `/track-order?orderNumber=${encodeURIComponent(
    orderNumber
  )}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-800 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-600 font-medium">Checking your order status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md ${
          isConfirmed
            ? "bg-emerald-100 text-emerald-600 shadow-emerald-50"
            : isCancelled
            ? "bg-red-100 text-red-600 shadow-red-50"
            : "bg-amber-100 text-amber-600 shadow-amber-50"
        }`}
      >
        {isConfirmed ? (
          <CheckCircle2 className="w-12 h-12 stroke-[2.2]" />
        ) : isCancelled ? (
          <AlertCircle className="w-12 h-12 stroke-[2.2]" />
        ) : (
          <Clock className="w-12 h-12 stroke-[2.2]" />
        )}
      </div>

      <span
        className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full mb-3 border ${
          isConfirmed
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : isCancelled
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}
      >
        {isConfirmed
          ? "Payment Verified & Order Confirmed"
          : isCancelled
          ? "Order Cancelled"
          : "Order Placed • Payment Under Verification"}
      </span>

      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 tracking-tight">
        {isConfirmed
          ? "Payment Confirmed. Thank You!"
          : isCancelled
          ? "This Order Was Cancelled"
          : "Thank You for Your Order!"}
      </h1>
      <p className="mt-2 text-base text-neutral-600 max-w-md mx-auto">
        {isConfirmed
          ? "Your payment has been matched and your handcrafted pieces are now being prepared with love and care."
          : isCancelled
          ? "The payment for this order was not approved. If money left your account, contact us with your UTR and we will reconcile it."
          : "We received your order and UPI reference. Our team checks the bank statement before packing your parcel. This page updates automatically when verified."}
      </p>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-left text-xs sm:text-sm text-amber-900 border border-amber-200">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Order Reference Card */}
      <div className="mt-8 bg-white border border-rose-100 rounded-2xl p-6 sm:p-8 text-left shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Order Reference
            </p>
            <p className="text-xl font-mono font-bold text-rose-950 mt-0.5">
              {orderNumber || "—"}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-medium ${
                isConfirmed
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isCancelled
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfirmed
                    ? "bg-emerald-500"
                    : isCancelled
                    ? "bg-red-500"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
              {isConfirmed
                ? "Payment verified"
                : isCancelled
                ? "Payment not approved"
                : "Awaiting UPI verification"}
            </span>
          </div>
        </div>

        {order && (
          <div className="grid grid-cols-2 gap-4 py-5 border-b border-neutral-100 text-xs">
            <div>
              <p className="text-neutral-500">Order total</p>
              <p className="font-bold text-neutral-900 text-sm">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">UPI reference</p>
              <p className="font-mono font-bold text-neutral-900 text-sm">
                {order.upiUtrLast4 ? `•••• ${order.upiUtrLast4}` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Fulfillment Timeline */}
        <div className="py-6 space-y-4">
          <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            What Happens Next?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/60">
              <ShieldCheck className="w-5 h-5 text-rose-700 mb-2" />
              <p className="text-xs font-bold text-neutral-800">
                1. Payment Check
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                {isConfirmed
                  ? "Your UTR matched the amount received in our bank account."
                  : "We match your 12-digit UTR against the amount received before packing."}
              </p>
            </div>
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/60">
              <PackageCheck className="w-5 h-5 text-rose-700 mb-2" />
              <p className="text-xs font-bold text-neutral-800">2. Handcrafted Prep</p>
              <p className="text-xs text-neutral-600 mt-1">
                Your jewelry & accessories are inspected, sanitized, and carefully packaged.
              </p>
            </div>
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/60">
              <Truck className="w-5 h-5 text-rose-700 mb-2" />
              <p className="text-xs font-bold text-neutral-800">3. Dispatched</p>
              <p className="text-xs text-neutral-600 mt-1">
                Handed to our courier partners. A tracking ID appears on your tracking page.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-3">
          <Link href={trackHref} className="flex-1">
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
            Share unboxing stories on Instagram and tag{" "}
            <span className="font-semibold text-rose-800">@theblingcorner_</span> for a feature & special discount!
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
