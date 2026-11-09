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
  Copy,
  Check,
  QrCode,
  Upload,
  CheckCircle2,
  Smartphone,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";
import { GoogleIcon } from "@/components/ui/icons";
import { signInWithGoogle } from "@/lib/firebase/auth";
import {
  MERCHANT_NAME,
  UPI_VPA,
  buildUpiPayUrl,
  isUpiConfigured,
} from "@/lib/upi-config";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

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

  // Direct UPI Payment State
  const [upiUtrNumber, setUpiUtrNumber] = React.useState("");
  const [upiScreenshotUrl, setUpiScreenshotUrl] = React.useState("");
  const [isUploadingScreenshot, setIsUploadingScreenshot] = React.useState(false);
  const [hasCopiedUpi, setHasCopiedUpi] = React.useState(false);

  // Coupon / Promo Code State
  const [couponCode, setCouponCode] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountAmount: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = React.useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Auto-fill logged-in customer info if available
  React.useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            if (data.user.name) setFullName(data.user.name);
            if (data.user.email) setEmail(data.user.email);
            if (data.user.phone) setPhone(data.user.phone);
          }
        }
      } catch (e) {
        console.warn("Failed to autofill logged in user:", e);
      }
    }
    loadUser();
  }, []);

  const handleGoogleAutofill = async () => {
    try {
      setErrorMessage(null);
      const googleUser = await signInWithGoogle();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(googleUser),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user?.name) setFullName(data.user.name);
        if (data.user?.email) setEmail(data.user.email);
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Google autofill error:", err);
      }
    }
  };

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

  // Final Total Amount with Coupon Discount
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalAmount = Math.max(0, subtotal + (shippingFee || 0) - discountAmount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    try {
      setIsValidatingCoupon(true);
      setCouponError(null);
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
          shippingFee: shippingFee || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Invalid coupon code.");
        return;
      }
      setAppliedCoupon(data.coupon);
      setCouponCode("");
    } catch {
      setCouponError("Failed to validate coupon code.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Dynamic UPI string for QR & App links
  const upiPayUrl = React.useMemo(() => {
    return buildUpiPayUrl({
      amount: totalAmount,
      note: `Order_${phone || "TBC"}`,
    });
  }, [totalAmount, phone]);

  const qrImageUrl = React.useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiPayUrl)}`;
  }, [upiPayUrl]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_VPA);
    setHasCopiedUpi(true);
    setTimeout(() => setHasCopiedUpi(false), 2000);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (JPG, PNG, or WebP).");
      return;
    }

    if (file.size > MAX_RECEIPT_BYTES) {
      setErrorMessage("Screenshot size must be under 8MB.");
      return;
    }

    try {
      setIsUploadingScreenshot(true);
      setErrorMessage(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/checkout/upload-receipt", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload screenshot.");
      }

      setUpiScreenshotUrl(data.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(err.message || "Failed to upload receipt screenshot.");
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Your shopping bag is empty. Please add items before checking out.");
      return;
    }

    if (!isUpiConfigured()) {
      setErrorMessage(
        "Direct UPI is temporarily unavailable. Please contact the store on Instagram."
      );
      return;
    }

    if (shippingFee === null) {
      setErrorMessage("Please enter a valid 6-digit postal pincode to calculate shipping charges.");
      return;
    }

    const cleanUtr = upiUtrNumber.trim().replace(/\D/g, "");
    if (cleanUtr.length !== 12) {
      setErrorMessage("Please enter the complete 12-digit UPI Reference Number (UTR) from your payment app.");
      return;
    }

    try {
      setIsSubmitting(true);

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
          paymentMethod: "DIRECT_UPI",
          expectedTotal: totalAmount,
          discountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0,
          couponCode: appliedCoupon?.code || undefined,
          upiUtrNumber: cleanUtr,
          upiScreenshotUrl: upiScreenshotUrl || undefined,
          notes: notes || undefined,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        setErrorMessage(orderData.error || "Failed to place order. Please check your details.");
        setIsSubmitting(false);
        return;
      }

      clearCart();
      const query = new URLSearchParams({
        orderNumber: orderData.orderNumber,
        paymentMethod: "DIRECT_UPI",
      });
      if (orderData.accessToken) query.set("token", orderData.accessToken);
      router.push(`/checkout/success?${query.toString()}`);
    } catch (err) {
      console.error("Checkout order submission error:", err);
      setErrorMessage("Network error during order submission. Please try again.");
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 tracking-tight">
                Direct UPI Checkout
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                Zero processing fees • Pay with Google Pay, PhonePe, Paytm, or any UPI app
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 self-start sm:self-auto">
              <Lock className="h-3.5 w-3.5 mr-1" /> 100% Free & Secure UPI
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-start space-x-2 rounded-2xl bg-red-50 p-4 text-xs sm:text-sm text-red-800 border border-red-200/80 animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
          {/* Left Form: Delivery Address & UPI Payment (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Contact Details */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                  1. Customer & WhatsApp Contact
                </h2>
                <span className="text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full">
                  Step 1 of 3
                </span>
              </div>

              {/* 1-Tap Autofill with Google */}
              <button
                type="button"
                onClick={handleGoogleAutofill}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100/80 text-xs font-semibold text-neutral-800 transition-colors shadow-2xs"
              >
                <GoogleIcon className="h-4 w-4" />
                <span>Quick Autofill Name & Email with Google</span>
              </button>
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
                  helperText="We send tracking updates directly on WhatsApp"
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
                    helperText="We will email your order confirmation receipt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address & Pincode */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                  2. Shipping Address & Delivery Pincode
                </h2>
                <span className="text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full">
                  Step 2 of 3
                </span>
              </div>
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
                    placeholder="Near City Mall, Opposite SBI Bank"
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
                    Speed Post Delivery ({shippingZone?.replace("_", " ")}):
                  </span>
                  <span className="font-bold">{formatPrice(shippingFee)}</span>
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-500">
                  Enter your 6-digit postal pincode above to calculate exact courier delivery charges.
                </div>
              )}
            </div>

            {/* Step 3: Direct UPI Payment Box */}
            <div className="bg-gradient-to-br from-rose-50/60 via-white to-pink-50/40 rounded-2xl border-2 border-rose-200 p-5 sm:p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-rose-900 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                    Direct Payment
                  </span>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 mt-1">
                    3. Pay via UPI ({formatPrice(totalAmount)})
                  </h2>
                </div>
                <span className="text-[11px] font-medium text-rose-800 bg-rose-100/70 px-2.5 py-1 rounded-full">
                  Step 3 of 3
                </span>
              </div>

              {/* Store & UPI Details Box */}
              <div className="bg-white p-4 rounded-xl border border-rose-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Store Name
                    </p>
                    <p className="text-sm font-bold text-rose-950">{MERCHANT_NAME}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Amount to Pay
                    </p>
                    <p className="text-lg font-mono font-black text-rose-900">
                      {formatPrice(totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Copyable UPI ID */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Merchant UPI ID
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-mono text-xs sm:text-sm font-bold text-neutral-900 select-all">
                      {UPI_VPA}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyUpiId}
                      className="h-9 px-3 text-xs font-semibold rounded-lg border-rose-200 text-rose-900 hover:bg-rose-50"
                    >
                      {hasCopiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copy ID
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* QR Code & Mobile Launchers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white p-4 rounded-xl border border-rose-100">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center">
                  <div className="relative w-44 h-44 bg-white p-2 rounded-lg border border-neutral-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImageUrl}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium mt-2 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-rose-800" />
                    Scan with any UPI App
                  </p>
                </div>

                {/* Mobile Intent Buttons */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-neutral-800">
                    On mobile? Tap your preferred UPI app:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={upiPayUrl}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-200 hover:border-rose-400 bg-neutral-50/50 hover:bg-rose-50/30 transition-colors text-xs font-semibold text-neutral-800"
                    >
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        Google Pay / GPay
                      </span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                    <a
                      href={upiPayUrl}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-200 hover:border-rose-400 bg-neutral-50/50 hover:bg-rose-50/30 transition-colors text-xs font-semibold text-neutral-800"
                    >
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-600" />
                        PhonePe
                      </span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                    <a
                      href={upiPayUrl}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-200 hover:border-rose-400 bg-neutral-50/50 hover:bg-rose-50/30 transition-colors text-xs font-semibold text-neutral-800"
                    >
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-sky-600" />
                        Paytm / BHIM
                      </span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                    <a
                      href={upiPayUrl}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-900 text-white hover:bg-rose-950 transition-colors text-xs font-bold shadow-sm"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Open Any UPI App ({formatPrice(totalAmount)})
                    </a>
                  </div>
                </div>
              </div>

              {/* UTR Input & Screenshot Upload */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="utrInput"
                      className="text-xs font-bold text-neutral-900"
                    >
                      Enter 12-Digit UPI Reference (UTR) Number <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {upiUtrNumber.trim().length}/12 Digits
                    </span>
                  </div>
                  <Input
                    id="utrInput"
                    type="text"
                    maxLength={12}
                    value={upiUtrNumber}
                    onChange={(e) => setUpiUtrNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 431289567012"
                    className="font-mono text-base tracking-widest font-bold text-rose-950 bg-white h-11"
                    required
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Found in your Google Pay / PhonePe / Paytm payment receipt under <strong>UTR</strong>, <strong>UPI Ref No.</strong>, or <strong>Txn ID</strong>.
                  </p>
                </div>

                {/* Upload Receipt Screenshot */}
                <div>
                  <label className="text-xs font-bold text-neutral-900 block mb-1">
                    Upload Payment Screenshot <span className="text-neutral-400 font-normal">(Optional for Faster Verification)</span>
                  </label>

                  {upiScreenshotUrl ? (
                    <div className="relative inline-flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={upiScreenshotUrl}
                          alt="Uploaded Receipt"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Screenshot Uploaded
                        </p>
                        <p className="text-[11px] text-emerald-700">Receipt attached to order</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUpiScreenshotUrl("")}
                        className="p-1 hover:bg-emerald-100 rounded-full text-emerald-700 ml-2"
                        title="Remove screenshot"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-rose-200 hover:border-rose-400 bg-white hover:bg-rose-50/20 rounded-xl cursor-pointer transition-colors text-center">
                      <Upload className="w-5 h-5 text-rose-700 mb-1" />
                      <span className="text-xs font-semibold text-neutral-800">
                        {isUploadingScreenshot ? "Uploading to secure CDN..." : "Click or tap to upload receipt image"}
                      </span>
                      <span className="text-[11px] text-neutral-400 mt-0.5">
                        PNG, JPG, or WebP up to 8MB
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotUpload}
                        disabled={isUploadingScreenshot}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Confirm Button (5 cols) */}
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
                        src={item.imageUrl || "/placeholder.svg"}
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

              {/* Coupon / Promo Code Box */}
              <div className="border-t border-neutral-100 pt-3">
                {appliedCoupon ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-950 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                        {appliedCoupon.code} Applied!
                      </p>
                      <p className="text-[10px] text-emerald-800">{appliedCoupon.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppliedCoupon(null)}
                      className="text-[11px] font-bold text-red-600 hover:underline ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon code (e.g. WELCOME10)"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError(null);
                        }}
                        className="flex-1 rounded-xl border border-neutral-300 py-1.5 px-3 text-xs uppercase placeholder:normal-case placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-rose-800"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode.trim()}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-50"
                      >
                        {isValidatingCoupon ? "Checking..." : "Apply"}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[10px] text-red-600 font-medium">{couponError}</p>
                    )}
                    <p className="text-[10px] text-neutral-400">
                      💡 Tip: Use <strong className="text-neutral-700">WELCOME10</strong> or <strong className="text-neutral-700">BLING50</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 border-t border-neutral-100 pt-4 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-neutral-900">{formatPrice(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
                  </div>
                )}
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

              {/* Zero-KYC Direct UPI Notice */}
              <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-relaxed space-y-1">
                <p className="font-bold">✨ Zero KYC / 100% Free Direct UPI:</p>
                <p>
                  No middleman payment gateway or fees. You pay directly to <strong>{UPI_VPA}</strong>, and our team verifies your 12-digit UTR before packing your parcel.
                </p>
              </div>

              {/* Place Order Button */}
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isUploadingScreenshot ||
                  !isUpiConfigured() ||
                  shippingFee === null ||
                  upiUtrNumber.trim().length !== 12
                }
                isLoading={isSubmitting}
                className="w-full h-12 text-sm font-bold bg-rose-900 hover:bg-rose-950 text-white shadow-md shadow-rose-900/10 rounded-xl"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Place Order ({formatPrice(totalAmount)})
              </Button>

              {upiUtrNumber.trim().length !== 12 && (
                <p className="text-[11px] text-amber-700 text-center font-medium">
                  ⚠️ Please enter the 12-digit UPI UTR number after paying to enable this button.
                </p>
              )}

              <div className="flex items-center justify-center space-x-2 text-[11px] text-neutral-400 text-center pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified by The Bling Corner • Safe & Direct</span>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
