"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { VendorNav } from "@/components/dashboard/VendorNav";
import { formatPrice } from "@/lib/utils";
import { UPI_VPA } from "@/lib/upi-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  ExternalLink,
  Filter,
  AlertTriangle,
  X,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  AlertCircle,
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
  paymentMethod?: string;
  upiUtrNumber?: string | null;
  upiScreenshotUrl?: string | null;
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
    id: string;
    status: string;
    paymentMethod: string;
  };
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = React.useState<VendorOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedFilter, setSelectedFilter] = React.useState<string>("ALL");

  // Mis-touch protection: Modal state for marking as SHIPPED
  const [shipModalOrder, setShipModalOrder] = React.useState<VendorOrder | null>(null);
  const [courierName, setCourierName] = React.useState("India Post Speed Post");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Modal for payment receipt preview & verification
  const [verifyModalOrder, setVerifyModalOrder] = React.useState<VendorOrder | null>(null);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);

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
      setActionError(null);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          courierName: cName || undefined,
          trackingNumber: tNum || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
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
        setShipModalOrder(null);
        setVerifyModalOrder(null);
        setTrackingNumber("");
        setRejectionReason("");
      } else {
        setActionError(data.error || "Could not update this order.");
      }
    } catch (err) {
      setActionError("Network error while updating the order.");
      console.error("Failed to update status", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpiAction = async (
    order: VendorOrder,
    action: "verify" | "reject"
  ) => {
    if (!order.payment?.id) {
      setActionError("This order has no payment record to verify.");
      return;
    }
    if (action === "reject" && rejectionReason.trim().length < 3) {
      setActionError("Please enter a rejection reason (at least 3 characters).");
      return;
    }

    try {
      setIsUpdating(true);
      setActionError(null);

      const res = await fetch(
        `/api/admin/payments/${encodeURIComponent(order.payment.id)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "verify"
              ? { note: "Verified against bank statement" }
              : { reason: rejectionReason.trim() }
          ),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || `Could not ${action} this payment.`);
        return;
      }

      setVerifyModalOrder(null);
      setRejectionReason("");
      await fetchOrders();
    } catch (err) {
      console.error("Payment action error", err);
      setActionError("Network error while updating the payment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "PENDING_PAYMENT") return o.status === "PENDING_PAYMENT";
    if (selectedFilter === "NEEDS_PACKING") return o.status === "PAID" || o.status === "PROCESSING";
    return o.status === selectedFilter;
  });

  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col">
      <VendorNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200/80 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
                Order Fulfillment Ledger
              </h1>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Zero-KYC Direct UPI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Verify Direct UPI payments, pack parcels, and confirm shipments with mis-touch protection.
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
            { key: "PENDING_PAYMENT", label: "💳 Verify Payment" },
            { key: "NEEDS_PACKING", label: "📦 Needs Packing" },
            { key: "PACKED", label: "🏷️ Packed" },
            { key: "SHIPPED", label: "🚚 Shipped" },
            { key: "DELIVERED", label: "✅ Delivered" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFilter === tab.key
                  ? "bg-rose-900 text-white shadow-sm"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-base text-neutral-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono">
                        {order.totalWeightGrams}g
                      </span>
                      <span className="text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                        Zone: {order.shippingZone.replace("_", " ")}
                      </span>
                      {order.paymentMethod === "DIRECT_UPI" && (
                        <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold">
                          Direct UPI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Ordered on {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>

                  {/* Status Badge & Total */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === "PENDING_PAYMENT"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                          : order.status === "PAID"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          : order.status === "PACKED"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : order.status === "SHIPPED"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : order.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {order.status === "PENDING_PAYMENT"
                        ? "Verify UPI Payment"
                        : order.status.replace("_", " ")}
                    </span>
                    <span className="text-base font-bold text-rose-950 font-serif">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Direct UPI Verification Highlight Banner */}
                {order.status === "PENDING_PAYMENT" && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900">
                          Direct UPI Payment Submitted:
                        </span>
                        <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-amber-300 text-neutral-900">
                          UTR: {order.upiUtrNumber || "Awaiting entry"}
                        </span>
                        {order.upiUtrNumber && (
                          <button
                            onClick={() => copyToClipboard(order.upiUtrNumber!, order.orderNumber)}
                            className="p-1 hover:bg-amber-100 rounded text-amber-800 text-[11px] font-semibold flex items-center gap-1"
                            title="Copy UTR"
                          >
                            {copiedUtr === order.orderNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Check your UPI app (Google Pay / PhonePe / Paytm / Yono SBI) for <strong>{formatPrice(order.totalAmount)}</strong> from {order.customer.fullName}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {order.upiScreenshotUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewImage(order.upiScreenshotUrl!)}
                          className="text-xs font-semibold rounded-lg border-amber-300 text-amber-900 hover:bg-amber-100 h-8 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Receipt
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => setVerifyModalOrder(order)}
                        className="text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white h-8 gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Payment & Pack
                      </Button>
                    </div>
                  </div>
                )}

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
                      <span>
                        {order.status === "PENDING_PAYMENT"
                          ? "Awaiting vendor UPI verification"
                          : "Awaiting parcel preparation & courier dispatch"}
                      </span>
                    </div>
                  )}

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
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

                    {/* MIS-TOUCH PROTECTED: SHIPPED BUTTON OPENS CONFIRMATION POPUP MODAL */}
                    {order.status === "PACKED" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setShipModalOrder(order);
                          setCourierName(order.courierName || "India Post Speed Post");
                          setTrackingNumber(order.trackingNumber || "");
                        }}
                        className="text-xs font-semibold rounded-xl bg-rose-900 hover:bg-rose-950 text-white h-8 gap-1.5 shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Ship Order (Safe Modal)
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
              </div>
            ))
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MIS-TOUCH SAFEGUARD: CONFIRMATION POPUP MODAL FOR MARKING AS SHIPPED      */}
      {/* ========================================================================= */}
      {shipModalOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in zoom-in-95">
            {/* Modal Warning Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Confirm Order Shipment
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Mis-touch protection active • Confirmation required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShipModalOrder(null)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Details Brief */}
            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/70 text-xs space-y-1.5 text-neutral-700">
              <div className="flex justify-between font-semibold">
                <span className="text-rose-950 font-mono font-bold">
                  {shipModalOrder.orderNumber}
                </span>
                <span className="font-bold text-neutral-900">
                  {formatPrice(shipModalOrder.totalAmount)}
                </span>
              </div>
              <p>
                <strong>Customer:</strong> {shipModalOrder.customer.fullName} ({shipModalOrder.customer.city}, {shipModalOrder.customer.state} - {shipModalOrder.customer.pincode})
              </p>
              <p className="text-[11px] text-neutral-500">
                <strong>Contents:</strong> {shipModalOrder.items.length} item(s) • Total Weight: {shipModalOrder.totalWeightGrams}g
              </p>
            </div>

            {/* Form Fields: Courier & AWB */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  Courier Partner
                </label>
                <Input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. India Post Speed Post, Delhivery, Blue Dart"
                  className="h-10 text-xs rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  AWB / Tracking Number (Required)
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. EK123456789IN or 1432890123"
                  className="h-10 text-xs font-mono rounded-xl bg-white font-bold"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  This tracking ID will be visible to the customer on their tracking page.
                </p>
              </div>
            </div>

            {/* Actions: Cancel vs Confirm */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShipModalOrder(null)}
                disabled={isUpdating}
                className="h-10 px-4 text-xs font-semibold rounded-xl border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              >
                Cancel (Prevent Mis-touch)
              </Button>

              <Button
                type="button"
                disabled={isUpdating || !trackingNumber.trim()}
                onClick={() =>
                  handleUpdateStatus(
                    shipModalOrder.orderNumber,
                    "SHIPPED",
                    courierName,
                    trackingNumber.trim()
                  )
                }
                className="h-10 px-5 text-xs font-bold rounded-xl bg-rose-900 hover:bg-rose-950 text-white shadow-md shadow-rose-900/10 gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                {isUpdating ? "Marking as Shipped..." : "Yes, Confirm Order as SHIPPED"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT UPI VERIFICATION MODAL                                              */}
      {/* ========================================================================= */}
      {verifyModalOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Verify Direct UPI Payment
                  </h3>
                  <p className="text-xs text-neutral-500">Order {verifyModalOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setVerifyModalOrder(null)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Expected Amount:</span>
                <span className="font-bold text-neutral-900 text-sm">
                  {formatPrice(verifyModalOrder.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer Name:</span>
                <span className="font-bold text-neutral-900">{verifyModalOrder.customer.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Submitted UTR:</span>
                <span className="font-mono font-bold text-rose-950 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {verifyModalOrder.upiUtrNumber || "N/A"}
                </span>
              </div>
            </div>

            {verifyModalOrder.upiScreenshotUrl && (
              <div>
                <p className="text-xs font-bold text-neutral-700 mb-1">Attached Receipt Screenshot:</p>
                <div
                  onClick={() => setPreviewImage(verifyModalOrder.upiScreenshotUrl!)}
                  className="relative w-full h-36 rounded-xl overflow-hidden border border-neutral-200 cursor-pointer group bg-neutral-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={verifyModalOrder.upiScreenshotUrl}
                    alt="Receipt Screenshot"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <Eye className="w-4 h-4" /> Tap to Zoom Full Size
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Rejection Reason (only used if you reject)
              </label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR not found in bank statement"
                className="h-10 text-xs rounded-xl bg-white"
              />
            </div>

            {actionError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              ⚠️ Please confirm money is credited in your UPI app (<strong>{UPI_VPA}</strong>) before confirming.
            </p>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUpiAction(verifyModalOrder, "reject")}
                disabled={isUpdating}
                className="text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50 rounded-xl"
              >
                Reject (Unpaid)
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleUpiAction(verifyModalOrder, "verify")}
                disabled={isUpdating || !verifyModalOrder.payment?.id}
                className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl"
              >
                {isUpdating ? "Confirming..." : "Confirmed, Mark as PAID"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Receipt Image Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-w-xl max-h-[85vh] w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Receipt Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
