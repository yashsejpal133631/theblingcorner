import * as React from "react";
import Link from "next/link";
import { FileText, CheckCircle, Scale } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata = {
  title: "Terms and Conditions | The Bling Corner",
  description: "Terms of service, purchasing rules, and legal agreements governing the use of The Bling Corner online store.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <FileText className="h-3.5 w-3.5" />
            <span>Customer Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            Terms and Conditions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Last updated: November 2026 • Governed by the laws of India
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-10 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or placing an order on <strong>The Bling Corner</strong> website or social channels, you agree to be legally bound by these terms, our Shipping Policy, and our Return/Refund Policy. If you do not agree with any portion, please refrain from using the store.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              2. Handcrafted Products & Aesthetic Variations
            </h2>
            <p>
              Many of our jewelry pieces, phone charms, and keychains are assembled by hand using beads, natural stones, resin, and metal findings. Minor color nuances, slight bead pattern variations, or micro-textures are characteristic of handmade artistry and are not considered manufacturing defects.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              3. Orders, Pricing & Prepayments
            </h2>
            <p>
              All prices listed on the website are in Indian Rupees (INR ₹) and are inclusive of applicable taxes. Shipping charges are calculated based on your delivery pincode during checkout.
            </p>
            <p>
              All orders must be prepaid in full prior to order fulfillment. For Direct UPI payments, orders are processed upon matching the submitted 12-digit UTR with bank confirmation records. We reserve the right to cancel any order if payment is incomplete or fraudulent.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              4. Intellectual Property
            </h2>
            <p>
              The Bling Corner name, logo, custom photography, product descriptions, website graphics, and branding are the intellectual property of The Bling Corner. Unauthorized reproduction, commercial re-use, or scraping without written consent is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Scale className="h-4 w-4 text-rose-800" /> 5. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms and Conditions and any purchases made shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500">
            For questions regarding our terms, write to us at{" "}
            <Link href="/contact" className="text-rose-900 font-semibold underline">
              contact support
            </Link>.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

