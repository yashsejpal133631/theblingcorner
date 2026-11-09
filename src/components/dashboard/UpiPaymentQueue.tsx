"use client";

import * as React from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  ExternalLink,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

interface PendingPaymentItem {
  id: string;
  title: string;
  quantity: number;
  totalPrice: number;
  weightGrams: number;
  thumbnailUrl: string;
}

interface PendingPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  utr: string | null;
  screenshotUrl: string | null;
  submittedAt: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    subtotal: number;
    shippingFee: number;
    totalAmount: number;
    totalWeightGrams: number;
    createdAt: string;
    customer: {
      fullName: string;
      phone: string;
      email: string;
      city: string;
      state: string;
      pincode: string;
      street: string;
      landmark: string;
    };
    items: PendingPaymentItem[];
  };
}

type ActionKind = "verify" | "reject";

export function UpiPaymentQueue({
  title = "UPI Payment Verification",
  subtitle = "Match each 12-digit UTR against the bank statement before approving. Approving marks the order PAID and reserves no further stock.",
  backHref,
}: {
  title?: string;
  subtitle?: string;
  backHref?: string;
}) {
  const [payments, setPayments] = React.useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [modalPayment, setModalPayment] = React.useState<PendingPayment | null>(
    null
  );
  const [modalAction, setModalAction] = React.useState<ActionKind>("verify");
  const [modalNote, setModalNote] = React.useState("");

  const fetchPayments = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetch("/api/admin/payments/pending", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || "Could not load pending payments.");
        return;
      }
      setPayments(data.payments || []);
    } catch {
      setLoadError("Network error while loading pending payments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const copyUtr = async (payment: PendingPayment) => {
    if (!payment.utr) return;
    try {
      await navigator.clipboard.writeText(payment.utr);
      setCopiedId(payment.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setActionError("Could not copy the UTR. Please select it manually.");
    }
  };

  const openModal = (payment: PendingPayment, action: ActionKind) => {
    setModalPayment(payment);
    setModalAction(action);
    setModalNote("");
    setActionError(null);
  };

  const submitModal = async () => {
    if (!modalPayment) return;

    const note = modalNote.trim();
    if (modalAction === "reject" && note.length < 3) {
      setActionError("Please enter a rejection reason (at least 3 characters).");
      return;
    }

    try {
      setBusyId(modalPayment.id);
      setActionError(null);

      const res = await fetch(
        `/api/admin/payments/${encodeURIComponent(modalPayment.id)}/${modalAction}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            modalAction === "verify"
              ? { note: note || "Verified against bank statement" }
              : { reason: note }
          ),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "The payment action failed.");
        return;
      }

      setPayments((prev) => prev.filter((p) => p.id !== modalPayment.id));
      setModalPayment(null);
      setModalNote("");
    } catch {
      setActionError("Network error while updating the payment.");
    } finally {
      setBusyId(null);
    }
  };

  const totalAwaiting = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {backHref && (
            <Link
              href={backHref}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              ← Back to dashboard
            </Link>
          )}
          <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight mt-1">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
              Awaiting review
            </p>
            <p className="text-sm font-bold text-neutral-900">
              {payments.length} payment{payments.length === 1 ? "" : "s"} •{" "}
              {formatPrice(totalAwaiting)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={isLoading}
            className="h-9 text-xs rounded-xl border-neutral-300 text-neutral-700 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{loadError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
          <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-neutral-500">
            Loading pending UPI payments...
          </p>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-700">
            No payments waiting for verification
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            New Direct UPI orders will appear here with their UTR and receipt.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base text-neutral-900">
                      {payment.order.orderNumber}
                    </span>
                    <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                      Awaiting UPI check
                    </span>
                    <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
                      {payment.order.totalWeightGrams}g
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Submitted{" "}
                    {new Date(payment.submittedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    • {payment.order.customer.fullName},{" "}
                    {payment.order.customer.city}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                    Amount to match
                  </p>
                  <p className="text-lg font-black text-rose-950 flex items-center gap-0.5 sm:justify-end">
                    <IndianRupee className="w-4 h-4" />
                    {formatPrice(payment.amount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-5">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold mb-1">
                      Submitted UTR
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-mono text-sm font-bold tracking-wider text-neutral-900 select-all">
                        {payment.utr || "Not provided"}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyUtr(payment)}
                        disabled={!payment.utr}
                        className="h-9 px-3 text-xs rounded-lg border-neutral-300 gap-1"
                      >
                        {copiedId === payment.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-3 text-xs space-y-1">
                    <p className="font-bold text-neutral-900">
                      {payment.order.customer.fullName}
                    </p>
                    <p>{payment.order.customer.street}</p>
                    {payment.order.customer.landmark && (
                      <p className="text-neutral-500">
                        Landmark: {payment.order.customer.landmark}
                      </p>
                    )}
                    <p>
                      {payment.order.customer.city},{" "}
                      {payment.order.customer.state} -{" "}
                      {payment.order.customer.pincode}
                    </p>
                    <p className="text-neutral-500">
                      {payment.order.customer.phone} •{" "}
                      {payment.order.customer.email}
                    </p>
                  </div>

                  <div className="text-xs text-neutral-600 space-y-1">
                    <p className="font-bold text-neutral-800">
                      Items ({payment.order.items.length})
                    </p>
                    {payment.order.items.map((item) => (
                      <p key={item.id} className="flex justify-between gap-3">
                        <span className="truncate">
                          {item.title} × {item.quantity}
                        </span>
                        <span className="font-semibold shrink-0">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {payment.screenshotUrl ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold mb-1">
                        Payment receipt
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(payment.screenshotUrl)}
                        className="relative w-full h-40 rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={payment.screenshotUrl}
                          alt="UPI payment receipt"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                          <Eye className="w-4 h-4" /> Open full size
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="h-40 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center text-xs text-neutral-500 text-center p-4">
                      No screenshot uploaded. Verify the UTR against the bank
                      statement before approving.
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => openModal(payment, "verify")}
                      disabled={Boolean(busyId)}
                      className="flex-1 h-10 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve payment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openModal(payment, "reject")}
                      disabled={Boolean(busyId)}
                      className="flex-1 h-10 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50 rounded-xl gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>

                  <Link
                    href={`/track-order?orderNumber=${encodeURIComponent(
                      payment.order.orderNumber
                    )}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open customer tracking page
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {modalPayment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {modalAction === "verify"
                    ? "Approve this payment?"
                    : "Reject this payment?"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Order {modalPayment.order.orderNumber} •{" "}
                  {formatPrice(modalPayment.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPayment(null)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-3 text-xs space-y-1">
              <p className="flex justify-between">
                <span className="text-neutral-500">UTR</span>
                <span className="font-mono font-bold">
                  {modalPayment.utr || "Not provided"}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-neutral-500">Amount</span>
                <span className="font-bold">
                  {formatPrice(modalPayment.amount)}
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                {modalAction === "verify"
                  ? "Verification note (optional)"
                  : "Rejection reason (required)"}
              </label>
              <Input
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder={
                  modalAction === "verify"
                    ? "e.g. UTR matched in SBI statement"
                    : "e.g. UTR not found in bank statement"
                }
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
              {modalAction === "verify"
                ? "Approving marks the order PAID and moves it into the packing queue. Only do this after the exact amount is visible in the store's UPI account."
                : "Rejecting cancels the order and returns the reserved stock. The customer will see that the payment was not approved."}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalPayment(null)}
                disabled={Boolean(busyId)}
                className="h-10 px-4 text-xs rounded-xl border-neutral-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitModal}
                disabled={Boolean(busyId)}
                isLoading={busyId === modalPayment.id}
                className={`h-10 px-5 text-xs font-bold rounded-xl text-white ${
                  modalAction === "verify"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {modalAction === "verify"
                  ? "Yes, approve payment"
                  : "Yes, reject payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot preview */}
      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Payment receipt full size"
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
