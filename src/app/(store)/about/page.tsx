import * as React from "react";
import Link from "next/link";
import { Sparkles, Heart, ShieldCheck, Truck, Star, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { InstagramIcon } from "@/components/ui/icons";

export const metadata = {
  title: "About Us | The Bling Corner",
  description: "Learn more about The Bling Corner - handcrafted aesthetic jewelry, phone charms, hair accessories, and cute stationery.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Our Handcrafted Story</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            About The Bling Corner
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
            Adding sparkle to your everyday aesthetic with unique, handcrafted accessories made with love and precision.
          </p>
        </div>

        {/* Story Section */}
        <div className="bg-white rounded-3xl border border-rose-100/80 p-6 sm:p-10 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 font-serif">Welcome to The Bling Corner! ✨</h2>
            <p>
              Started as an Instagram passion project (<Link href="https://www.instagram.com/theblingcorner_" target="_blank" className="text-rose-900 font-semibold underline">@theblingcorner_</Link>), <strong>The Bling Corner</strong> was born out of a deep love for cute, aesthetic, and functional everyday accessories.
            </p>
            <p>
              From custom glass beaded bracelets and Japanese bell keychains to resin floral hair clips and pastel stationery, every single item in our collection is either hand-assembled or meticulously curated to bring a smile to your face whenever you use it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-900">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-neutral-900 text-sm">100% Handcrafted</h3>
              <p className="text-xs text-neutral-500">
                Each charm, bead string, and keychain is hand-finished with attention to durability and sparkle.
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-900">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-neutral-900 text-sm">Safe Pan-India Delivery</h3>
              <p className="text-xs text-neutral-500">
                Packed in bubble wrap and sturdy mailers to ensure your aesthetic bling arrives in pristine condition.
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-neutral-900 text-sm">Honest & Transparent</h3>
              <p className="text-xs text-neutral-500">
                Direct WhatsApp and Instagram support with live order tracking for complete peace of mind.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-3">
            <h3 className="font-bold text-rose-950 text-sm flex items-center gap-2">
              <Star className="h-4 w-4 fill-rose-900 text-rose-900" />
              Our Promise to You
            </h3>
            <p className="text-xs sm:text-sm text-neutral-700">
              We know how special accessories are to personal style or gifting your besties. If you ever have a custom charm request, color preference, or order query, we are always just a DM or WhatsApp message away.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <Link
              href="https://www.instagram.com/theblingcorner_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-bold text-rose-900 hover:text-rose-950"
            >
              <InstagramIcon className="h-4 w-4 mr-1.5" /> Join our 10k+ Instagram Community &rarr;
            </Link>

            <Link
              href="/catalog"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-rose-900 text-white text-xs sm:text-sm font-bold hover:bg-rose-950 transition-colors shadow-xs"
            >
              Shop Handcrafted Bling <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

