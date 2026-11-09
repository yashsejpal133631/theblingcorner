"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Sparkles, Printer, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

function InvoiceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = (params?.orderNumber as string) || "";
  const contact = searchParams.get("contact") || "";

  const [order, setOrder] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadOrder() {
      if (!orderNumber) return;
      try {
        setIsLoading(true);
        setError(null);
        const query = contact ? `?contact=${encodeURIComponent(contact)}` : "";
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}${query}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Unable to load invoice.");
          return;
        }

        setOrder(data.order);
      } catch (err: any) {
        setError("Network error while loading invoice.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [orderNumber, contact]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900" />
          <p className="text-xs text-neutral-600 font-medium">Generating Official Order Receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm border border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-900">Unable to Display Invoice</h2>
          <p className="text-xs text-neutral-600">{error || "Order not found."}</p>
          <div className="pt-2">
            <Link
              href={`/track-order?orderNumber=${encodeURIComponent(orderNumber)}`}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-900 text-white text-xs font-bold hover:bg-rose-950"
            >
              Verify Contact on Track Order &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-neutral-100 py-6 sm:py-10 px-4 sm:px-6 print:p-0 print:bg-white text-neutral-900">
      {/* Top Floating Action Bar (Hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`}
          className="inline-flex items-center text-xs font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Order Tracking
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-900 hover:bg-rose-950 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
        </button>
      </div>

      {/* Main Printable Invoice Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-neutral-300 p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-neutral-200 pb-6 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-900">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xl font-extrabold tracking-tight font-serif text-neutral-900">
                The Bling Corner
              </span>
            </div>
            <p className="text-xs text-neutral-500">Handcrafted Aesthetic Accessories & Jewelry</p>
            <p className="text-[11px] text-neutral-500">Instagram: @theblingcorner_ • Web: theblingcorner.vercel.app</p>
            <p className="text-[11px] text-neutral-500">Dispatch Studio: Mumbai & Surat, India</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-rose-900 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
              Tax Invoice / Cash Receipt
            </span>
            <p className="text-sm font-bold font-mono text-neutral-900">#{order.orderNumber}</p>
            <p className="text-xs text-neutral-500">Date: {invoiceDate}</p>
            <p className="text-xs text-emerald-700 font-semibold flex sm:justify-end items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Status: {order.status.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* Billed To / Shipping Address Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-neutral-700">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
              Shipped & Billed To
            </h4>
            <p className="font-semibold text-neutral-900 text-sm">{order.recipientName}</p>
            <p className="text-neutral-600">
              {order.city ? `${order.city}, ${order.state}` : "Delivery Address On File"}
            </p>
            {order.pincode && <p className="text-neutral-600">Pincode: {order.pincode}</p>}
            {order.maskedPhone && <p className="text-neutral-600">Phone: {order.maskedPhone}</p>}
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
              Payment & Dispatch Info
            </h4>
            <p className="text-neutral-600">
              Payment Method: <strong>{order.paymentMethod === "DIRECT_UPI" ? "Direct UPI Transfer" : order.paymentMethod}</strong>
            </p>
            {order.upiUtrLast4 && (
              <p className="text-neutral-600">
                Bank UTR / Ref: <strong>•••• •••• {order.upiUtrLast4}</strong>
              </p>
            )}
            <p className="text-neutral-600">
              Courier Partner: <strong>{order.courierName || "Standard Verified Courier"}</strong>
            </p>
            {order.trackingNumber && (
              <p className="text-neutral-600">
                AWB Tracking: <strong>{order.trackingNumber}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-200 bg-neutral-50/70 text-neutral-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {order.items.map((item: any, idx: number) => (
                <tr key={item.id} className="text-neutral-800">
                  <td className="py-3 px-3 text-neutral-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-neutral-900">{item.title}</p>
                    <span className="text-[10px] text-neutral-400">Handcrafted Aesthetic Item</span>
                  </td>
                  <td className="py-3 px-3 text-center font-medium">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-medium">₹{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-bold text-neutral-900">
                    ₹{Number(item.totalPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-2 border-t border-neutral-200">
          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Item Subtotal</span>
              <span className="font-medium">₹{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Shipping Charges</span>
              <span className="font-medium">
                {Number(order.shippingFee) > 0 ? `₹${Number(order.shippingFee).toFixed(2)}` : "FREE"}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
              <span>Total Paid</span>
              <span className="text-rose-950 font-serif">₹{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes & Digital Stamp */}
        <div className="border-t border-neutral-200 pt-6 text-[11px] text-neutral-500 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Prepaid 100% Verified Order • No Cash Collection Due on Delivery</span>
          </div>
          <p className="leading-relaxed">
            * Note: For transit damage claims, please record a continuous, uncut 360-degree unboxing video within 48 hours of delivery and contact WhatsApp support.
          </p>
          <div className="pt-2 text-center text-[10px] text-neutral-400 border-t border-neutral-100">
            This is a computer-generated invoice and does not require a physical signature. Thank you for supporting handcrafted Indian small business! ✨
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900" />
            <p className="text-xs text-neutral-600 font-medium">
              Generating Official Order Receipt...
            </p>
          </div>
        </div>
      }
    >
      <InvoiceContent />
    </React.Suspense>
  );
}
