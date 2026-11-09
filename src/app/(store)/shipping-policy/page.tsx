import * as React from "react";
import Link from "next/link";
import { Truck, Clock, ShieldCheck, MapPin } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata = {
  title: "Shipping & Delivery Policy | The Bling Corner",
  description: "Shipping timelines, delivery rates, courier partners, and tracking guidelines for The Bling Corner across India.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <Truck className="h-3.5 w-3.5" />
            <span>Pan-India Delivery</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            Shipping & Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Last updated: November 2026 • Verified Courier Partners Across All Indian Pincodes
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-10 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-xs sm:text-sm">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-800" /> 1. Processing & Dispatch Timeline
            </h2>
            <p>
              Because our jewelry pieces, keychains, and charms are handcrafted with special attention to detail, please allow <strong>24 to 48 business hours</strong> for our team to assemble, inspect, and safely package your order.
            </p>
            <p>
              Orders placed on Sundays or national holidays are dispatched on the next working business day. During high-demand festive seasons or flash sales, dispatch may occasionally take up to 72 hours.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-800" /> 2. Estimated Delivery Time
            </h2>
            <p>
              Once handed over to our courier partner (Delhivery, BlueDart, DTDC, Xpressbees, or India Post Speed Post), delivery timelines are typically as follows:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-600">
              <li><strong>Metro Cities (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata):</strong> 3 to 4 business days.</li>
              <li><strong>Tier 2 & Tier 3 Cities (Rest of India):</strong> 4 to 6 business days.</li>
              <li><strong>Remote / Northeast / J&K Locations:</strong> 6 to 8 business days.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-rose-800" /> 3. Shipping Charges
            </h2>
            <p>
              Shipping fees are calculated accurately based on your destination postal pincode and total parcel weight. Rates start at <strong>₹49</strong> for local/regional shipping and <strong>₹79</strong> for pan-India courier delivery.
            </p>
            <p>
              We occasionally offer <strong>Free Shipping</strong> promotional banners on orders above specified basket thresholds (e.g. orders over ₹999).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              4. Order Tracking & WhatsApp Notifications
            </h2>
            <p>
              As soon as your parcel is manifested, we generate a unique Air Waybill (AWB) number and send it directly to your WhatsApp number and email. You can check the live tracking status at any time on our{" "}
              <Link href="/track-order" className="text-rose-900 font-semibold underline">
                Track Order Page
              </Link>.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              5. Delivery Address Accuracy & Re-dispatch
            </h2>
            <p>
              Please ensure your complete delivery address, landmark, and 6-digit pincode are entered accurately. If a shipment is returned to origin (RTO) due to an incorrect address, inaccessible location, or repeated refusal to answer the courier agent's call, re-dispatch charges will apply.
            </p>
          </section>

          {/* Support CTA */}
          <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-neutral-700">
            For urgent delivery assistance or address change requests prior to dispatch, please contact us immediately on{" "}
            <Link href="/contact" className="text-rose-900 font-bold underline">
              Customer Support
            </Link>{" "}
            or message us directly on WhatsApp.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

