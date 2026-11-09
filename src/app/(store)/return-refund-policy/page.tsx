import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, CheckCircle2, Video } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata = {
  title: "Return & Refund Policy | The Bling Corner",
  description: "Replacement terms, 48-hour unboxing video requirements, and refund guidelines for The Bling Corner.",
};

export default function ReturnRefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Customer Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            Return & Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Last updated: November 2026 • 100% Fair Replacement for Transit Damages
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-10 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-xs sm:text-sm">
          {/* Unboxing Notice Alert */}
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <Video className="h-4 w-4 text-amber-800" />
              <span>Mandatory 360° Unboxing Video Rule</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Because all handcrafted accessories are inspected under studio lighting and double-bubble-wrapped prior to courier handover, a continuous, uncut 360-degree unboxing video showing the outer shipping label and opening of the seal is <strong>strictly mandatory</strong> for all transit damage, wrong item, or missing item claims.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              1. 48-Hour Reporting Window
            </h2>
            <p>
              If your order arrives damaged, broken, or with a missing item, please report the issue within <strong>48 hours</strong> of marked delivery. Claims raised after 48 hours cannot be entertained as courier insurance claims expire.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              2. What Qualifies for a Free Replacement?
            </h2>
            <ul className="list-disc list-inside space-y-2 text-neutral-600 pl-2">
              <li>Item snapped, bent, or broken in transit.</li>
              <li>Incorrect product or variant delivered (e.g. wrong charm model or color).</li>
              <li>Product missing from the sealed courier package.</li>
            </ul>
            <p className="pt-1">
              Once verified via your unboxing video, we will dispatch a <strong>brand new replacement parcel free of charge</strong> with priority shipping.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-800" /> 3. Non-Returnable Items (Hygiene & Customization)
            </h2>
            <p>
              Due to strict hygiene standards under India Consumer Protection guidelines, earrings, hair clips, and hair accessories that have been worn or opened cannot be returned for subjective preferences (e.g. "change of mind" or "color doesn't match my outfit").
            </p>
            <p>
              Similarly, customized charms or name-beaded bracelets crafted specifically for your request are non-returnable unless defective.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              4. Refunds & Store Credits
            </h2>
            <p>
              In the rare event that an exact replacement item is out of stock, we offer two options:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-600 pl-2">
              <li><strong>Direct UPI Refund:</strong> Credited back to your original paying UPI ID within 2 to 3 business days.</li>
              <li><strong>Store Credit Voucher:</strong> Instant 100% value coupon code valid for 12 months with no minimum spend.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-rose-800" /> 5. How to Submit a Claim
            </h2>
            <p>
              Simply send a WhatsApp message to our support line or an email with:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-neutral-600 pl-2">
              <li>Your Order Number (e.g. <code>TBC-2026-XXXX</code>)</li>
              <li>Your Name & Mobile Number</li>
              <li>Your uncut unboxing video and clear photo of the shipping label</li>
            </ol>
            <p className="pt-2">
              Our support team reviews claims within 12 business hours. Contact us at{" "}
              <Link href="/contact" className="text-rose-900 font-bold underline">
                The Bling Corner Support
              </Link>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

