"use client";

import * as React from "react";
import { formatPrice } from "@/lib/utils";
import { Truck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface DeliveryEstimatorProps {
  weightGrams: number;
  onShippingCalculated?: (data: { fee: number; zone: string; pincode: string }) => void;
}

export function DeliveryEstimator({ weightGrams, onShippingCalculated }: DeliveryEstimatorProps) {
  const [pincode, setPincode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    city: string;
    state: string;
    shippingFee: number;
    estimatedDeliveryDays: string;
    zone: string;
  } | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pincode.trim().replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      setError("Please enter a valid 6-digit postal pincode.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: cleanPin, weightGrams }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not calculate shipping for this pincode.");
        return;
      }

      setResult(data);
      if (onShippingCalculated) {
        onShippingCalculated({
          fee: data.shippingFee,
          zone: data.zone,
          pincode: cleanPin,
        });
      }
    } catch {
      setError("Failed to connect. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
      <div className="flex items-center space-x-2">
        <Truck className="h-4 w-4 text-rose-900" />
        <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
          Check Delivery & Shipping Charges
        </h4>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="Enter 6-digit Pincode"
          className="flex-1 h-10 px-3 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-rose-900 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || pincode.length < 6}
          className="h-10 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check"}
        </button>
      </form>

      {error && (
        <p className="flex items-center text-[11px] text-red-600 font-medium">
          <AlertCircle className="h-3.5 w-3.5 mr-1 flex-shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3 space-y-1.5 text-xs text-neutral-700 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-emerald-950">
            <span className="flex items-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
              Delivery to {result.city}, {result.state}
            </span>
            <span>{formatPrice(result.shippingFee)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
            <span>Estimated Delivery:</span>
            <span className="font-semibold text-neutral-800">{result.estimatedDeliveryDays}</span>
          </div>
        </div>
      )}
    </div>
  );
}

