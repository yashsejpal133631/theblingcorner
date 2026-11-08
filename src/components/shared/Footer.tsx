import * as React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Truck, CreditCard, Heart } from "lucide-react";

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
                <p className="text-[11px] sm:text-xs text-neutral-500">Secure UPI & Card payments</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-900">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Verified Courier Shipping</h4>
                <p className="text-[11px] sm:text-xs text-neutral-500">Flat weight-based shipping across India</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Handcrafted Quality</h4>
                <p className="text-[11px] sm:text-xs text-neutral-500">Made with care for every customer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-900">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                The Bling Corner
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-sm">
              Your one-stop destination for trendy handcrafted jewelry, aesthetic phone charms, resin hair clips, and cute stationery.
            </p>
            <div className="pt-2">
              <Link
                href="https://www.instagram.com/theblingcorner_"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-semibold text-rose-900 hover:text-rose-950"
              >
                Follow us on Instagram @theblingcorner_ &rarr;
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Categories
            </h5>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><Link href="/catalog?category=keychains" className="hover:text-neutral-900">Keychains</Link></li>
              <li><Link href="/catalog?category=hair-clips" className="hover:text-neutral-900">Hair Clips</Link></li>
              <li><Link href="/catalog?category=stationery" className="hover:text-neutral-900">Cute Stationery</Link></li>
              <li><Link href="/catalog?category=bracelets" className="hover:text-neutral-900">Beaded Bracelets</Link></li>
              <li><Link href="/catalog?category=charms" className="hover:text-neutral-900">Phone & Bag Charms</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Customer Support
            </h5>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><Link href="/track-order" className="text-rose-900 font-semibold hover:text-rose-950">Track Your Parcel</Link></li>
              <li><Link href="/catalog" className="hover:text-neutral-900">Browse Catalog</Link></li>
              <li><Link href="/login" className="hover:text-neutral-900">Sign In / Register</Link></li>
              <li><Link href="/login?redirect=/vendor" className="hover:text-neutral-900">Store Owner Portal</Link></li>
              <li><Link href="/login?redirect=/admin" className="hover:text-neutral-900">Super Admin Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
          <p>&copy; 2026 The Bling Corner. All rights reserved.</p>
          <p className="flex items-center">
            Designed with <Heart className="h-3 w-3 text-rose-600 mx-1 inline fill-current" /> for The Bling Corner
          </p>
        </div>
      </div>
    </footer>
  );
}
