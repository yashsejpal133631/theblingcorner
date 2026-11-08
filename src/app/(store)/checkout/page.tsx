"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  CreditCard,
  Truck,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Lock,
} from "lucide-react";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, totalWeightGrams, clearCart } = useCart();

  // Address Form State
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [landmark, setLandmark] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Shipping calculation state
  const [shippingFee, setShippingFee] = React.useState<number | null>(null);
  const [shippingZone, setShippingZone] = React.useState<string | null>(null);
  const [deliveryDays, setDeliveryDays] = React.useState<string | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = React.useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Load Razorpay Script
  React.useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Auto-calculate shipping whenever 6-digit pincode is entered
  React.useEffect(() => {
    const cleanPin = pincode.trim().replace(/\D/g, "");
    if (cleanPin.length === 6) {
      async function calculateRate() {
        try {
          setIsCalculatingShipping(true);
          const res = await fetch("/api/shipping/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pincode: cleanPin,
              weightGrams: totalWeightGrams || 150,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setShippingFee(data.shippingFee);
            setShippingZone(data.zone);
            setDeliveryDays(data.estimatedDeliveryDays);
            if (!city) setCity(data.city);
            if (!state) setState(data.state);
          }
        } catch (e) {
          console.warn("Shipping rate calculation failed:", e);
        } finally {
          setIsCalculatingShipping(false);
        }
      }
      calculateRate();
    } else {
      setShippingFee(null);
    }
  }, [pincode, totalWeightGrams, city, state]);

  // Final Total Amount
  const totalAmount = subtotal + (shippingFee || 0);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Your shopping bag is empty. Please add items before checking out.");
      return;
    }

    if (!shippingFee) {
      setErrorMessage("Please enter a valid 6-digit postal pincode to calculate shipping charges.");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create order on server
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || undefined,
            quantity: i.quantity,
          })),
          shippingAddress: {
            fullName,
            phone,
            email,
            street,
            landmark: landmark || undefined,
            city,
            state,
            pincode,
          },
          notes: notes || undefined,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        setErrorMessage(orderData.error || "Failed to initiate order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 2. Mock payment handler for local testing or test mode
      const isMock =
        !window.Razorpay ||
        orderData.razorpayOrderId.startsWith("order_mock_") ||
        orderData.razorpayKeyId.includes("placeholder");

      if (isMock) {
        // Automatically verify mock payment in dev test environment
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderData.razorpayOrderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature_valid",
            orderNumber: orderData.orderNumber,
          }),
        });

        if (verifyRes.ok) {
          clearCart();
          router.push(`/checkout/success?orderNumber=${orderData.orderNumber}`);
        } else {
          setErrorMessage("Mock payment verification failed.");
          setIsSubmitting(false);
        }
        return;
      }

      // 3. Launch live Razorpay standard checkout modal
      const options: RazorpayOptions = {
        key: orderData.razorpayKeyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency,
        name: "The Bling Corner",
        description: `Order ${orderData.orderNumber}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderNumber: orderData.orderNumber,
              }),
            });

            if (verifyRes.ok) {
              clearCart();
              router.push(`/checkout/success?orderNumber=${orderData.orderNumber}`);
            } else {
              setErrorMessage("Payment verification failed. Please contact support.");
              setIsSubmitting(false);
            }
          } catch {
            setErrorMessage("Network error during payment verification.");
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: fullName,
          email,
          contact: phone,
        },
        theme: {
          color: "#881337", // Rose 900
        },
      };

      if (!window.Razorpay) {
        setErrorMessage("Payment gateway failed to initialize. Please refresh the page.");
        setIsSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
      setIsSubmitting(false);
    } catch (err) {
      console.error("Payment initiation error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50/50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center flex-1">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Your Shopping Bag is Empty</h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6">
            Please add items to your cart before proceeding to checkout.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-rose-900 text-white text-xs sm:text-sm font-bold hover:bg-rose-950"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Return to Catalog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
        {/* Header */}
        <div className="pb-6 border-b border-neutral-200">
          <Link
            href="/cart"
            className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Bag
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Prepaid Checkout
            </h1>
            <span className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              <Lock className="h-3.5 w-3.5 mr-1" /> 256-Bit SSL Encrypted
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-start space-x-2 rounded-2xl bg-red-50 p-4 text-xs sm:text-sm text-red-800 border border-red-200/80"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
          {/* Left Form: Delivery Address (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contact details */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4 shadow-sm">
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                1. Customer & WhatsApp Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="fullName"
                  label="Full Name"
                  type="text"
                  placeholder="Pooja Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  id="phone"
                  label="WhatsApp / Mobile Number"
                  type="tel"
                  placeholder="9876543210"
                  helperText="For instant delivery & tracking updates"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="pooja@gmail.com"
                    helperText="We will email your official paid receipt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4 shadow-sm">
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                2. Shipping Address & Pincode
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    id="street"
                    label="Street Address / House / Flat No."
                    type="text"
                    placeholder="Flat 402, Sunshine Heights, Rose Garden Road"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    id="landmark"
                    label="Landmark (Optional)"
                    type="text"
                    placeholder="Near City Mall"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    id="pincode"
                    label="Postal Pincode (6 Digits)"
                    type="text"
                    maxLength={6}
                    placeholder="400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    id="city"
                    label="City"
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    id="state"
                    label="State"
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Shipping Rate Notice */}
              {isCalculatingShipping ? (
                <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-500 animate-pulse">
                  Calculating courier delivery rate from rate chart...
                </div>
              ) : shippingFee !== null ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                  <span className="flex items-center">
                    <Truck className="h-4 w-4 text-emerald-700 mr-1.5" />
                    Courier Charge ({shippingZone}):
                  </span>
                  <span className="font-bold">{formatPrice(shippingFee)}</span>
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-500">
                  Enter your 6-digit postal pincode above to calculate exact courier delivery charges.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Payment Button (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-sm sticky top-24">
              <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                Order Breakdown
              </h2>

              {/* Items preview */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1 divide-y divide-neutral-100 text-xs">
                {items.map((item) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                      <Image
                        src={item.imageUrl || "/images/placeholder.jpg"}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{item.title}</p>
                      <p className="text-neutral-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-neutral-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 border-t border-neutral-100 pt-4 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-neutral-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex items-center">
                    <Truck className="h-3.5 w-3.5 mr-1 text-rose-900" />
                    Delivery Charge ({totalWeightGrams}g)
                  </span>
                  <span className="font-bold text-neutral-900">
                    {shippingFee !== null ? formatPrice(shippingFee) : "Enter Pincode"}
                  </span>
                </div>
                {deliveryDays && (
                  <p className="text-[11px] text-neutral-400 text-right">
                    Est. Delivery: {deliveryDays}
                  </p>
                )}
                <div className="border-t border-neutral-200 pt-3 flex items-center justify-between">
                  <span className="text-base font-extrabold text-neutral-900">Total Payable</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-950">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Prepaid Only Notice */}
              <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-relaxed">
                ℹ️ <strong>100% Prepaid Online Order:</strong> Cash on Delivery (COD) is not accepted. Your order will be packed and dispatched immediately upon verified online payment.
              </div>

              {/* Pay Online Button */}
              <Button
                type="submit"
                disabled={isSubmitting || shippingFee === null}
                isLoading={isSubmitting}
                className="w-full h-12 text-sm font-bold shadow-md shadow-rose-900/10"
              >
                <CreditCard className="mr-2 h-4 w-4" /> Pay {formatPrice(totalAmount)} Online
              </Button>

              <div className="flex items-center justify-center space-x-2 text-[11px] text-neutral-400 text-center pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>UPI (GPay/PhonePe), Cards & NetBanking Supported</span>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

