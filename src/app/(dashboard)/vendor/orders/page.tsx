"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { VendorNav } from "@/components/dashboard/VendorNav";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  totalPrice: number;
  weightGrams: number;
  thumbnailUrl: string;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  status:
    | "PENDING_PAYMENT"
    | "PAID"
    | "PROCESSING"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  totalWeightGrams: number;
  shippingZone: string;
  trackingNumber: string | null;
  courierName: string | null;
  createdAt: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    pincode: string;
    street: string;
    landmark?: string;
  };
  items: OrderItem[];
  payment?: {
    status: string;
    paymentMethod: string;
  };
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = React.useState<VendorOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedFilter, setSelectedFilter] = React.useState<string>("ALL");

  // Dispatch modal / inline state
  const [dispatchingOrderId, setDispatchingOrderId] = React.useState<string | null>(null);
  const [courierName, setCourierName] = React.useState("India Post Speed Post");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/vendor/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (
    orderNumber: string,
    newStatus: string,
    cName?: string,
    tNum?: string
  ) => {
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          courierName: cName || undefined,
          trackingNumber: tNum || undefined,
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderNumber === orderNumber
              ? {
                  ...o,
                  status: newStatus as any,
                  courierName: cName || o.courierName,
                  trackingNumber: tNum || o.trackingNumber,
                }
              : o
          )
        );
        setDispatchingOrderId(null);
        setTrackingNumber("");
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "PENDING") return o.status === "PAID" || o.status === "PROCESSING";
    return o.status === selectedFilter;
  });

  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col">
      <VendorNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200/80 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
              Order Fulfillment Ledger
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Track customer orders, prepare parcels, and update tracking numbers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              className="text-xs font-semibold rounded-xl border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            >
              Refresh Orders
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 border-b border-neutral-200/60">
          {[
            { key: "ALL", label: "All Orders" },
            { key: "PENDING", label: "Needs Packing" },
            { key: "PACKED", label: "Packed" },
            { key: "SHIPPED", label: "Shipped" },
            { key: "DELIVERED", label: "Delivered" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFilter === tab.key
                  ? "bg-rose-900 text-white"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
              <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium text-neutral-500">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
              <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-700">No orders in this status</p>
              <p className="text-xs text-neutral-500 mt-0.5">When customers place orders, they appear here.</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-rose-200 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-neutral-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono">
                        {order.totalWeightGrams}g
                      </span>
                      <span className="text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                        Zone: {order.shippingZone.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Ordered on {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>

                  {/* Status Badge & Total */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === "PAID"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : order.status === "PACKED"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : order.status === "SHIPPED"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : order.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                    <span className="text-sm font-bold text-rose-950 font-serif">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Middle details: customer & items */}
                <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer & Address */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Delivery Details
                    </p>
                    <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-100 text-xs text-neutral-700 space-y-1">
                      <p className="font-bold text-neutral-900">{order.customer.fullName}</p>
                      <p>{order.customer.street}</p>
                      {order.customer.landmark && <p className="text-neutral-500">Landmark: {order.customer.landmark}</p>}
                      <p>{order.customer.city}, {order.customer.state} - {order.customer.pincode}</p>
                      <div className="pt-2 mt-2 border-t border-neutral-200/60 flex items-center gap-3">
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-900 font-medium"
                        >
                          <Phone className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{order.customer.phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/91${order.customer.phone}?text=Hi%20${encodeURIComponent(order.customer.fullName)},%20this%20is%20The%20Bling%20Corner%20regarding%20your%20Order%20${order.orderNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Package Contents ({order.items.length})
                    </p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 bg-neutral-50/50 p-2 rounded-lg border border-neutral-100">
                          <div className="relative w-10 h-10 bg-neutral-200 rounded-md overflow-hidden shrink-0">
                            <Image
                              src={item.thumbnailUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-neutral-900 truncate">{item.title}</p>
                            <p className="text-[11px] text-neutral-500">
                              Qty: {item.quantity} • Weight: {item.weightGrams}g
                            </p>
                          </div>
                          <p className="text-xs font-bold text-neutral-900 shrink-0">
                            {formatPrice(item.totalPrice)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dispatch Status / Action Footer */}
                <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {order.trackingNumber ? (
                    <div className="text-xs text-neutral-600 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>
                        Dispatched via <strong className="text-neutral-900">{order.courierName}</strong> (AWB: <span className="font-mono font-bold text-rose-900">{order.trackingNumber}</span>)
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Awaiting parcel preparation & courier dispatch</span>
                    </div>
                  )}

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {order.status === "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(order.orderNumber, "PACKED")}
                        disabled={isUpdating}
                        className="text-xs font-semibold rounded-xl border-blue-200 text-blue-800 hover:bg-blue-50 h-8"
                      >
                        Mark as Packed
                      </Button>
                    )}

                    {(order.status === "PAID" || order.status === "PACKED") && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setDispatchingOrderId(order.orderNumber);
                          setCourierName(order.courierName || "India Post Speed Post");
                          setTrackingNumber(order.trackingNumber || "");
                        }}
                        className="text-xs font-semibold rounded-xl bg-rose-900 hover:bg-rose-950 text-white h-8 gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Enter Tracking & Dispatch
                      </Button>
                    )}

                    {order.status === "SHIPPED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(order.orderNumber, "DELIVERED")}
                        disabled={isUpdating}
                        className="text-xs font-semibold rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 h-8"
                      >
                        Mark as Delivered
                      </Button>
                    )}

                    <Link
                      href={`/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                      target="_blank"
                      className="text-xs text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center gap-0.5 ml-1"
                    >
                      <span>Public Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Inline Dispatch Form Modal */}
                {dispatchingOrderId === order.orderNumber && (
                  <div className="mt-4 p-4 rounded-xl bg-rose-50/70 border border-rose-200 animate-in fade-in">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-950 mb-3">
                      Courier Dispatch Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                          Courier Partner
                        </label>
                        <Input
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          placeholder="e.g. India Post, Delhivery, Blue Dart"
                          className="h-9 text-xs rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                          AWB / Tracking Number
                        </label>
                        <Input
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="e.g. IN982736412"
                          className="h-9 text-xs rounded-lg font-mono bg-white"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDispatchingOrderId(null)}
                        className="text-xs text-neutral-600 h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={isUpdating || !trackingNumber.trim()}
                        onClick={() =>
                          handleUpdateStatus(
                            order.orderNumber,
                            "SHIPPED",
                            courierName,
                            trackingNumber.trim()
                          )
                        }
                        className="bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold h-8 rounded-lg"
                      >
                        {isUpdating ? "Saving..." : "Confirm Dispatch"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

