"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, HelpCircle, ChevronDown, ChevronUp, Search, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

interface FAQItem {
  q: string;
  a: string;
  category: "Shipping" | "Payments" | "Products" | "Returns";
}

const FAQ_DATA: FAQItem[] = [
  {
    category: "Shipping",
    q: "How many days will it take for my order to arrive?",
    a: "Orders are handcrafted and dispatched within 24 to 48 business hours. Delivery usually takes 3 to 7 business days depending on your postal pincode (metros typically receive parcels in 3-4 days; remote areas take 5-7 days).",
  },
  {
    category: "Shipping",
    q: "How do I track my order?",
    a: "Once your package is packed and shipped, we update your Tracking Number (AWB) and courier partner details. You can view real-time status on our Track Order page (/track-order) or via the WhatsApp update sent to your phone.",
  },
  {
    category: "Shipping",
    q: "How much are the shipping charges?",
    a: "Shipping is calculated automatically by delivery zone and order weight when you enter your 6-digit pincode during checkout. Standard rates start from ₹49 for local/regional delivery and ₹79 for pan-India orders.",
  },
  {
    category: "Payments",
    q: "What payment methods are supported?",
    a: "We accept 100% secure Direct UPI (Google Pay, PhonePe, Paytm, BHIM) with instant QR code scanning and UTR verification. We also support Credit/Debit Cards and Net Banking.",
  },
  {
    category: "Payments",
    q: "Do you offer Cash on Delivery (COD)?",
    a: "No, The Bling Corner operates strictly on a 100% Prepaid model. Because our jewelry pieces and charms are delicate and handcrafted, prepaid shipping prevents fake orders and return transit damages.",
  },
  {
    category: "Payments",
    q: "What is a 12-digit UPI Reference / UTR Number?",
    a: "Whenever you pay via Google Pay, PhonePe, or Paytm, the bank generates a unique 12-digit transaction ID labeled as 'UTR', 'UPI Ref No.', or 'Google Transaction ID'. Entering this during checkout allows us to instantly verify your payment.",
  },
  {
    category: "Products",
    q: "Are the bracelets and charms durable?",
    a: "Yes! We use high-grade nylon threads, stainless steel jump rings, and high-quality glass and resin beads designed to resist daily wear. We recommend avoiding direct exposure to heavy perfumes and swimming pool water for longest shine.",
  },
  {
    category: "Products",
    q: "Can I request custom colors or customized names?",
    a: "Absolutely! For customized initial charms or name bracelets, please contact us on Instagram @theblingcorner_ or WhatsApp with your design idea before placing the order.",
  },
  {
    category: "Returns",
    q: "What is your return and exchange policy?",
    a: "If an item arrives damaged or broken during transit, please notify us within 48 hours of delivery with a mandatory 360-degree unboxing video. We will immediately ship a free replacement or issue a store credit.",
  },
  {
    category: "Returns",
    q: "Why is an unboxing video mandatory?",
    a: "Because all products are hand-inspected and bubble-wrapped before leaving our studio, courier transit insurance claims require clear video proof showing the package seal being opened.",
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const categories = ["All", "Shipping", "Payments", "Products", "Returns"];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCat = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch =
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            Everything you need to know about our handcrafted accessories, delivery timelines, and payment methods.
          </p>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto pt-4">
            <Search className="absolute left-3.5 top-7 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search questions (e.g. tracking, COD, delivery time)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-neutral-300 py-3 pl-10 pr-4 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:border-rose-800 shadow-xs bg-white"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-rose-900 text-white shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:border-rose-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 p-8 space-y-3">
              <HelpCircle className="h-8 w-8 text-neutral-400 mx-auto" />
              <p className="text-xs sm:text-sm text-neutral-500">
                No matching answers found for "{searchQuery}".
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center text-xs font-bold text-rose-900 hover:underline"
              >
                Ask us directly on WhatsApp &rarr;
              </Link>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-4 hover:bg-neutral-50/50"
                  >
                    <span className="text-xs sm:text-sm font-bold text-neutral-900">
                      {faq.q}
                    </span>
                    <span className="text-rose-900 flex-shrink-0">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3 animate-in fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 bg-gradient-to-r from-rose-50 to-pink-50 rounded-3xl p-6 sm:p-8 border border-rose-100 text-center space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-neutral-900">
            Still have questions or special requirements?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
            Our support team is here to assist you with order modifications, bulk gifting, or custom jewelry pieces.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="https://wa.me/919876543210?text=Hello%20The%20Bling%20Corner,%20I%20have%20a%20question"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp Support
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs transition-colors"
            >
              Email Contact Form
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

