import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, UserCheck, EyeOff } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata = {
  title: "Privacy Policy | The Bling Corner",
  description: "How The Bling Corner protects your personal data, delivery addresses, and payment information under the Digital Personal Data Protection (DPDP) framework.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <Lock className="h-3.5 w-3.5" />
            <span>Data Security & Trust</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Last updated: November 2026 • Compliant with Digital Personal Data Protection Act (DPDP)
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-10 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-rose-800" /> 1. Commitment to Your Privacy
            </h2>
            <p>
              At <strong>The Bling Corner</strong>, we treat your privacy and personal data with utmost respect. We only collect the bare minimum information needed to process your orders, ship handcrafted items to your doorstep, and provide order status notifications.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              2. Information We Collect
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-600 pl-2">
              <li><strong>Contact Details:</strong> Full name, email address, WhatsApp/mobile phone number.</li>
              <li><strong>Delivery Information:</strong> House/flat number, street name, landmark, city, state, and 6-digit postal pincode.</li>
              <li><strong>Order & Payment Details:</strong> Items purchased, total amount, 12-digit UPI UTR number, or payment gateway reference ID. (Note: We never collect, store, or have access to your bank passwords, UPI PINs, or raw credit/debit card numbers).</li>
              <li><strong>Google Authentication:</strong> When you sign in with Google, we securely receive your verified name, email address, and profile photo avatar.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-rose-800" /> 3. How We Use & Share Your Data
            </h2>
            <p>
              We do <strong>NOT</strong> sell, rent, or trade your personal data to any marketing brokers or third parties. Your information is strictly shared with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-2">
              <li><strong>Authorized Courier Partners:</strong> To print your shipping label and physically deliver your package.</li>
              <li><strong>Communication APIs:</strong> To send automated WhatsApp and email parcel tracking updates.</li>
              <li><strong>Legal Authorities:</strong> Only when strictly mandated by applicable laws of India.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-rose-800" /> 4. Your Rights Under DPDP
            </h2>
            <p>
              You have the full right to review, update, or request permanent deletion of your account and personal data from our systems at any time. Simply email us at{" "}
              <Link href="/contact" className="text-rose-900 font-semibold underline">
                contact support
              </Link>{" "}
              with the subject "Data Erasure Request" from your registered email.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              5. Cookies & Local Storage
            </h2>
            <p>
              Our website uses essential first-party cookies and browser local storage strictly to keep your shopping bag active across pages and maintain secure logged-in sessions. We do not use third-party intrusive tracking cookies.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

