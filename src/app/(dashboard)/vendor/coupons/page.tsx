"use client";

import * as React from "react";
import {
  Tag,
  Plus,
  Percent,
  Sparkles,
  Trash2,
  Power,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Clock,
  X,
} from "lucide-react";
import { VendorNav } from "@/components/dashboard/VendorNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Coupon } from "@/lib/coupons";

export default function VendorCouponsPage() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // New Coupon Form Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newCode, setNewCode] = React.useState("");
  const [newType, setNewType] = React.useState<"PERCENT" | "FLAT" | "FREE_SHIPPING">("PERCENT");
  const [newValue, setNewValue] = React.useState<number>(10);
  const [newMinOrder, setNewMinOrder] = React.useState<string>("299");
  const [newMaxDiscount, setNewMaxDiscount] = React.useState<string>("150");
  const [newExpiry, setNewExpiry] = React.useState<string>("");
  const [newDesc, setNewDesc] = React.useState<string>("");

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/vendor/coupons");
      const data = await res.json();
      if (res.ok && data.success) {
        setCoupons(data.coupons);
      } else {
        setErrorMessage(data.error || "Failed to load coupons");
      }
    } catch (err) {
      setErrorMessage("Network error loading coupons");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadCoupons();
  }, []);

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      setErrorMessage(null);
      const newStatus = !coupon.isActive;
      const res = await fetch(`/api/vendor/coupons/${encodeURIComponent(coupon.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update coupon status");
        return;
      }
      setCoupons((prev) =>
        prev.map((c) => (c.code === coupon.code ? { ...c, isActive: newStatus } : c))
      );
      setSuccessMessage(
        newStatus
          ? `Coupon '${coupon.code}' is now ACTIVE for customers!`
          : `Festival Over! Coupon '${coupon.code}' is now PAUSED/CANCELLED.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage("Failed to toggle coupon");
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to permanently delete coupon '${code}'?`)) return;
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/vendor/coupons/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.code !== code));
        setSuccessMessage(`Coupon '${code}' permanently removed.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage("Failed to delete coupon");
      }
    } catch {
      setErrorMessage("Network error deleting coupon");
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await fetch("/api/vendor/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          type: newType,
          value: Number(newValue),
          minOrderValue: newMinOrder ? Number(newMinOrder) : undefined,
          maxDiscount: newMaxDiscount ? Number(newMaxDiscount) : undefined,
          description:
            newDesc.trim() ||
            (newType === "PERCENT"
              ? `${newValue}% OFF on handcrafted items`
              : newType === "FLAT"
              ? `Flat ₹${newValue} OFF on your order`
              : "Free Pan-India Delivery"),
          isActive: true,
          expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create coupon");
        return;
      }

      setCoupons((prev) => [data.coupon, ...prev.filter((c) => c.code !== data.coupon.code)]);
      setIsModalOpen(false);
      setNewCode("");
      setNewDesc("");
      setNewExpiry("");
      setSuccessMessage(`Festival coupon '${data.coupon.code}' created and live!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage("Network error creating coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = coupons.filter((c) => c.isActive).length;
  const pausedCount = coupons.length - activeCount;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/60">
      <VendorNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-100 text-rose-900">
                <Tag className="h-5 w-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900">
                Coupons & Festival Discounts
              </h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Create, edit, pause, or cancel festival discounts. Customers can only use coupons you mark as Active.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs self-start sm:self-auto gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create New Coupon
          </Button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Coupons</span>
            <p className="text-2xl font-extrabold text-neutral-900 font-serif">{coupons.length}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-2xs space-y-1 bg-emerald-50/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active for Customers
            </span>
            <p className="text-2xl font-extrabold text-emerald-800 font-serif">{activeCount}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-2xs space-y-1 bg-amber-50/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <Power className="h-3.5 w-3.5" /> Paused / Festival Over
            </span>
            <p className="text-2xl font-extrabold text-amber-800 font-serif">{pausedCount}</p>
          </div>
        </div>

        {/* Coupons List */}
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900 mb-2" />
            <p className="text-xs text-neutral-500">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200 space-y-3">
            <Tag className="h-8 w-8 text-neutral-400 mx-auto" />
            <h3 className="text-base font-bold text-neutral-900">No Coupons Configured</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Create your first promo code (e.g. DIWALI20 or WELCOME10) to offer discounts to shoppers!
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-rose-900 text-white text-xs h-9 px-4 rounded-xl"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Coupon
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coupons.map((coupon) => {
              const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();

              return (
                <div
                  key={coupon.code}
                  className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs flex flex-col justify-between space-y-4 ${
                    !coupon.isActive
                      ? "border-neutral-200 bg-neutral-50/40 opacity-75"
                      : "border-rose-100 hover:border-rose-300 hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Pill & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-3 py-1 rounded-xl bg-neutral-900 text-white font-mono font-bold text-xs tracking-wider shadow-2xs">
                          {coupon.code}
                        </span>
                        <p className="text-[11px] text-neutral-500 mt-1">{coupon.description}</p>
                      </div>

                      <div className="text-right">
                        {isExpired ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Expired
                          </span>
                        ) : coupon.isActive ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Paused
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rules Box */}
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <strong className="text-neutral-900">
                          {coupon.type === "PERCENT"
                            ? `${coupon.value}% OFF ${coupon.maxDiscount ? `(Up to ₹${coupon.maxDiscount})` : ""}`
                            : coupon.type === "FLAT"
                            ? `Flat ₹${coupon.value} OFF`
                            : "100% Free Shipping"}
                        </strong>
                      </div>

                      {coupon.minOrderValue ? (
                        <div className="flex justify-between">
                          <span>Min Cart Value:</span>
                          <span className="font-semibold text-neutral-800">₹{coupon.minOrderValue}</span>
                        </div>
                      ) : null}

                      {coupon.expiresAt ? (
                        <div className="flex justify-between text-[11px] text-neutral-500">
                          <span>Expires:</span>
                          <span>{new Date(coupon.expiresAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(coupon)}
                      className={`flex-1 inline-flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        coupon.isActive
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5 mr-1.5" />
                      {coupon.isActive ? "Pause / Festival Over" : "Activate Coupon"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(coupon.code)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create New Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-neutral-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-800" />
                <h3 className="font-serif font-bold text-lg text-neutral-900">
                  Create Festival / Store Coupon
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Coupon Promo Code (Caps, No Spaces)
                </label>
                <Input
                  id="couponCodeInput"
                  placeholder="e.g. DIWALI20, RAKHI50, LOVE10"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Discount Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 p-2.5 bg-white text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-800"
                  >
                    <option value="PERCENT">Percentage (% OFF)</option>
                    <option value="FLAT">Flat Amount (₹ OFF)</option>
                    <option value="FREE_SHIPPING">Free Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    {newType === "PERCENT" ? "Discount Percentage (%)" : newType === "FLAT" ? "Discount Amount (₹)" : "Value"}
                  </label>
                  <Input
                    id="couponValueInput"
                    type="number"
                    min="0"
                    max={newType === "PERCENT" ? "100" : undefined}
                    disabled={newType === "FREE_SHIPPING"}
                    value={newValue}
                    onChange={(e) => setNewValue(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Min. Cart Value (₹)</label>
                  <Input
                    id="minOrderInput"
                    type="number"
                    placeholder="e.g. 299"
                    value={newMinOrder}
                    onChange={(e) => setNewMinOrder(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Max Discount Cap (₹) {newType !== "PERCENT" && "(N/A)"}
                  </label>
                  <Input
                    id="maxDiscountInput"
                    type="number"
                    placeholder="e.g. 150"
                    disabled={newType !== "PERCENT"}
                    value={newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Expiry Date (Optional — leaves active until paused manually)
                </label>
                <Input
                  id="expiryDateInput"
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Description / Festival Note
                </label>
                <Input
                  id="descInput"
                  placeholder="e.g. Diwali Flash Sale - 20% OFF on all keychains & bracelets"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl text-xs h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="flex-1 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs h-10 rounded-xl"
                >
                  Create & Activate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

