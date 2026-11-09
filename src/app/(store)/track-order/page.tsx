"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InstagramIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface OrderItemData {
  id: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weightGrams: number;
  thumbnailUrl: string;
}

interface OrderData {
  orderNumber: string;
  status:
    | "PENDING_PAYMENT"
    | "PAID"
    | "PROCESSING"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  totalWeightGrams: number;
  shippingZone: string;
  trackingNumber: string | null;
  courierName: string | null;
  recipientName: string;
  city: string;
  state: string;
  pincode: string;
  maskedPhone: string;
  items: OrderItemData[];
  payment?: {
    status: string;
    paymentMethod: string;
    updatedAt: string;
  } | null;
}

const ORDER_STEPS = [
  { key: "PAID", label: "Confirmed", description: "Payment verified" },
  { key: "PROCESSING", label: "Handcrafting", description: "In preparation" },
  { key: "PACKED", label: "Packed", description: "Ready to dispatch" },
  { key: "SHIPPED", label: "Dispatched", description: "With courier partner" },
  { key: "DELIVERED", label: "Delivered", description: "Received at doorstep" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "PENDING_PAYMENT":
      return -1;
    case "PAID":
      return 0;
    case "PROCESSING":
      return 1;
    case "PACKED":
      return 2;
    case "SHIPPED":
      return 3;
    case "DELIVERED":
      return 4;
    case "CANCELLED":
      return -2;
    default:
      return 0;
  }
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderParam = searchParams.get("orderNumber") || "";
  const accessToken = searchParams.get("token") || "";

  const [orderQuery, setOrderQuery] = React.useState(initialOrderParam);
  const [contact, setContact] = React.useState("");
  const [order, setOrder] = React.useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [hasCopiedTracking, setHasCopiedTracking] = React.useState(false);

  const fetchOrder = React.useCallback(
    async (num: string, contactValue: string = "") => {
      const clean = num.trim().toUpperCase();
      if (!clean) return;

      if (!accessToken && contactValue.trim().length < 5) {
        setOrder(null);
        setErrorMessage(
          "Enter the phone number or email used when placing the order."
        );
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (accessToken) params.set("token", accessToken);
        if (contactValue.trim()) params.set("contact", contactValue.trim());

        const res = await fetch(
          `/api/orders/${encodeURIComponent(clean)}?${params.toString()}`
        );
        const data = await res.json();

        if (!res.ok) {
          setOrder(null);
          setErrorMessage(
            data.error || "Order not found. Please verify your reference number."
          );
        } else {
          setOrder(data.order);
        }
      } catch {
        setErrorMessage("Network error fetching order details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken]
  );

  React.useEffect(() => {
    if (initialOrderParam && accessToken) {
      fetchOrder(initialOrderParam);
    }
  }, [initialOrderParam, accessToken, fetchOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderQuery.trim()) {
      fetchOrder(orderQuery, contact);
    }
  };

  const copyTrackingToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedTracking(true);
    setTimeout(() => setHasCopiedTracking(false), 2000);
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 text-xs font-semibold uppercase tracking-wider rounded-full mb-2 border border-rose-200">
          Parcel Status & Tracking
        </span>
        <h1 className="text-3xl font-serif font-bold text-neutral-900 tracking-tight">
          Track Your Order
        </h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-md mx-auto">
          Enter your order reference number (from your confirmation receipt or Instagram order message).
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="space-y-2 max-w-lg mx-auto mb-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="e.g. TBC-202611-1049"
              className="pl-10 h-12 rounded-xl border-neutral-300 font-mono text-sm uppercase"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !orderQuery.trim()}
            className="h-12 px-6 bg-rose-900 hover:bg-rose-950 text-white rounded-xl font-medium shrink-0"
          >
            {isLoading ? "Searching..." : "Track"}
          </Button>
        </div>
        {!accessToken && (
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email used on the order"
            className="h-11 rounded-xl border-neutral-300 text-sm"
            aria-label="Phone or email used on the order"
          />
        )}
        <p className="text-[11px] text-neutral-500 text-center">
          {accessToken
            ? "Signed order link detected. Details load automatically."
            : "For your privacy, order details require the phone number or email used at checkout."}
        </p>
      </form>

      {/* Error state */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 mb-8">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Order Not Found</p>
            <p className="mt-0.5 text-xs text-red-600">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Order Results Card */}
      {order && (
        <div className="bg-white border border-rose-100/80 rounded-2xl shadow-sm overflow-hidden">
          {/* Top Banner */}
          <div className="p-6 bg-neutral-900 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-rose-300 font-medium">Order Number</span>
                <span className="text-xs bg-rose-950/80 border border-rose-800 text-rose-200 px-2 py-0.5 rounded">
                  {order.totalWeightGrams}g Total Weight
                </span>
              </div>
              <h2 className="text-2xl font-mono font-bold mt-1 tracking-tight text-white">
                {order.orderNumber}
              </h2>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 bg-rose-900/80 border border-rose-700 text-rose-100 rounded-full text-xs font-semibold uppercase tracking-wider">
                Status: {order.status.replace("_", " ")}
              </span>
              <p className="text-xs text-neutral-400 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="p-6 border-b border-neutral-100 bg-rose-50/20">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-6">
              Fulfillment Journey
            </h3>

            {order.status === "PENDING_PAYMENT" && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Payment Verification In Progress</p>
                  <p className="text-amber-800 mt-0.5">
                    We have received your order with Direct UPI payment. The Bling Corner team is verifying the UTR in our bank account. Once confirmed, status will update to &quot;Confirmed&quot;!
                  </p>
                </div>
              </div>
            )}

            {order.status === "CANCELLED" ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                This order was cancelled and no payment was confirmed. If money left your account, contact us with your UTR so we can reconcile it.
              </div>
            ) : (
              <div className="relative">
                {/* Horizontal progress bar line on desktop */}
                <div className="hidden sm:block absolute top-4 left-6 right-6 h-1 bg-neutral-200 -z-0">
                  <div
                    className="h-full bg-rose-900 transition-all duration-500"
                    style={{
                      width: `${Math.max(0, (currentStep / (ORDER_STEPS.length - 1)) * 100)}%`,
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                  {ORDER_STEPS.map((step, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;

                    return (
                      <div
                        key={step.key}
                        className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2 sm:p-0 rounded-lg ${
                          isCurrent ? "bg-rose-50/80 sm:bg-transparent" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isDone
                              ? "bg-rose-900 text-white shadow-sm ring-4 ring-rose-100"
                              : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                        </div>
                        <div className="text-left sm:text-center">
                          <p
                            className={`text-xs font-bold ${
                              isCurrent
                                ? "text-rose-950 font-extrabold"
                                : isDone
                                ? "text-neutral-900"
                                : "text-neutral-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[11px] text-neutral-500">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Courier & Tracking Section (If Dispatched) */}
          {order.trackingNumber ? (
            <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> Dispatched via {order.courierName || "Courier Partner"}
                </span>
                <p className="text-sm font-mono font-bold text-neutral-900 mt-1">
                  AWB / Tracking Number: <span className="text-rose-900">{order.trackingNumber}</span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyTrackingToClipboard(order.trackingNumber || "")}
                className="self-start sm:self-auto border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-1.5 text-xs rounded-xl"
              >
                {hasCopiedTracking ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {hasCopiedTracking ? "Copied!" : "Copy AWB"}
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Your items are currently in queue for handcrafted creation and quality packing. Tracking ID will update as soon as the courier picks up the parcel.
              </span>
            </div>
          )}

          {/* Items & Shipping Snapshot */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Items */}
            <div>
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
                Items in this Order ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center border-b border-neutral-100 pb-3 last:border-none">
                    <div className="relative w-12 h-12 bg-neutral-100 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">{item.title}</p>
                      {item.variantTitle && (
                        <p className="text-[11px] text-neutral-500">Variant: {item.variantTitle}</p>
                      )}
                      <p className="text-[11px] text-neutral-500">
                        Qty: {item.quantity} × {formatPrice(item.unitPrice)} ({item.weightGrams}g)
                      </p>
                    </div>
                    <p className="text-xs font-bold text-neutral-900 shrink-0">
                      {formatPrice(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination & Payment Summary */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" /> Delivery Address
                </h3>
                <div className="bg-neutral-50 p-3.5 rounded-xl text-xs text-neutral-700 leading-relaxed border border-neutral-100">
                  <p className="font-semibold text-neutral-900">{order.recipientName}</p>
                  <p>{order.city}, {order.state} - {order.pincode}</p>
                  <p className="text-neutral-500 mt-1">Phone: {order.maskedPhone}</p>
                  <p className="text-neutral-500">Shipping Zone: {order.shippingZone.replace("_", " ")}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                  Payment Summary
                </h3>
                <div className="bg-neutral-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-neutral-100">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal:</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Shipping Fee (weight-based):</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-900 font-bold pt-1.5 border-t border-neutral-200 text-sm">
                    <span>
                      {order.paymentStatus === "SUCCESS" ? "Total Paid:" : "Order Total:"}
                    </span>
                    <span className="text-rose-900">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Help & Instagram contact */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-neutral-400" />
              Need help or customized modification for this order?
            </span>
            <a
              href={`https://ig.me/m/theblingcorner_?text=Hi%20The%20Bling%20Corner,%20I%20have%20a%20query%20about%20Order%20${order.orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-rose-900 font-semibold hover:underline"
            >
              <InstagramIcon className="w-3.5 h-3.5 fill-rose-900" />
              <span>Message Store on Instagram</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />
      <main className="flex-1">
        <React.Suspense
          fallback={
            <div className="max-w-md mx-auto px-4 py-20 text-center">
              <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-800 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-neutral-600 text-sm">Loading tracking details...</p>
            </div>
          }
        >
          <TrackOrderContent />
        </React.Suspense>
      </main>
      <Footer />
    </div>
  );
}

