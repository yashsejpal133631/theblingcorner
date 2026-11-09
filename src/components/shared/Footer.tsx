import * as React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Truck, CreditCard, Heart, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";

// Kept static so the footer can be prerendered deterministically. Update this
// when the year changes (or move it into CMS metadata later).
const COPYRIGHT_YEAR = 2026;

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-neutral-200 mt-auto">
      {/* Trust Highlights */}
      <div className="border-b border-neutral-100 py-6 sm:py-8 bg-neutral-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-900">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900">100% Prepaid Only</h4>
                <p className="text-[11px] sm:text-xs text-neutral-500">Secure Direct UPI & Card payments</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-900">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Verified Courier Shipping</h4>
                <p className="text-[11px] sm:text-xs text-neutral-500">Pan-India delivery with live tracking</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Handcrafted Quality</h4>
                <p className="text-[11px] sm:text-xs text-neutral-500">48h replacement for transit damage</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand info (2 cols on lg) */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-900">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight text-neutral-900 font-serif">
                The Bling Corner
              </span>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
              Your destination for aesthetic handcrafted jewelry, phone charms, resin hair accessories, and cute stationery. Made with love for your daily sparkle.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="https://www.instagram.com/theblingcorner_"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition-colors"
              >
                <InstagramIcon className="h-3.5 w-3.5 mr-1.5" /> @theblingcorner_
              </Link>
              <Link
                href="https://wa.me/919876543210?text=Hello%20The%20Bling%20Corner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp Support
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Collections
            </h5>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><Link href="/catalog?category=keychains" className="hover:text-neutral-900">Keychains</Link></li>
              <li><Link href="/catalog?category=hair-clips" className="hover:text-neutral-900">Hair Clips</Link></li>
              <li><Link href="/catalog?category=stationery" className="hover:text-neutral-900">Cute Stationery</Link></li>
              <li><Link href="/catalog?category=bracelets" className="hover:text-neutral-900">Beaded Bracelets</Link></li>
              <li><Link href="/catalog?category=charms" className="hover:text-neutral-900">Phone & Bag Charms</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Customer Care
            </h5>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><Link href="/track-order" className="text-rose-900 font-semibold hover:text-rose-950">Track Your Order</Link></li>
              <li><Link href="/about" className="hover:text-neutral-900">About Our Brand</Link></li>
              <li><Link href="/contact" className="hover:text-neutral-900">Contact & Support</Link></li>
              <li><Link href="/faq" className="hover:text-neutral-900">FAQs & Help</Link></li>
              <li><Link href="/login" className="hover:text-neutral-900">Customer Sign In</Link></li>
            </ul>
          </div>

          {/* Policies & Legal */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Policies & Legal
            </h5>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><Link href="/shipping-policy" className="hover:text-neutral-900">Shipping & Delivery</Link></li>
              <li><Link href="/return-refund-policy" className="hover:text-neutral-900">Return & Refunds</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-neutral-900">Privacy Policy (DPDP)</Link></li>
              <li><Link href="/terms-and-conditions" className="hover:text-neutral-900">Terms of Service</Link></li>
              <li><Link href="/login?redirect=/vendor" className="hover:text-neutral-900 text-neutral-400">Vendor Login</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="mt-10 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-3">
          <p>&copy; {COPYRIGHT_YEAR} The Bling Corner. Handcrafted in India. All rights reserved.</p>
          <p className="flex items-center">
            Crafted with <Heart className="h-3 w-3 text-rose-600 mx-1 inline fill-current" /> for aesthetic accessory lovers
          </p>
        </div>
      </div>
    </footer>
  );
}
