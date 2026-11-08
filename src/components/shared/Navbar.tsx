"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ShoppingBag, User, Search, Menu, X } from "lucide-react";

import { useCart } from "@/context/CartContext";

interface NavbarProps {
  cartItemCount?: number;
  onOpenCart?: () => void;
}

export function Navbar({ cartItemCount: propCount, onOpenCart: propOpen }: NavbarProps) {
  const { itemCount: contextCount, openCart: contextOpen } = useCart();
  const cartItemCount = propCount !== undefined ? propCount : contextCount;
  const onOpenCart = propOpen !== undefined ? propOpen : contextOpen;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const categories = [
    { name: "Keychains", href: "/catalog?category=keychains" },
    { name: "Hair Clips", href: "/catalog?category=hair-clips" },
    { name: "Stationery", href: "/catalog?category=stationery" },
    { name: "Bracelets", href: "/catalog?category=bracelets" },
    { name: "Charms", href: "/catalog?category=charms" },
    { name: "Wipes", href: "/catalog?category=wipes" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
      {/* Announcement Bar */}
      <div className="bg-rose-900 text-white text-[11px] sm:text-xs text-center py-1.5 px-4 font-medium tracking-wide">
        ✨ 100% Handcrafted Aesthetic Accessories • Fast Prepaid Shipping Across India!
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-neutral-700 hover:text-neutral-900"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link href="/catalog" className="p-2 text-neutral-700 hover:text-neutral-900 ml-1">
              <Search className="h-5 w-5" />
            </Link>
          </div>

          {/* Logo */}
          <div className="flex-1 lg:flex-none text-center lg:text-left">
            <Link href="/" className="inline-flex items-center space-x-2">
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-rose-100 text-rose-900">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="text-base sm:text-xl font-extrabold tracking-tight text-neutral-900 font-serif">
                The Bling Corner
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-neutral-600">
            <Link href="/catalog" className="hover:text-rose-900 transition-colors">
              All Products
            </Link>
            {categories.slice(0, 5).map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="hover:text-rose-900 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
            <Link href="/track-order" className="hover:text-rose-900 transition-colors text-rose-800 font-semibold">
              Track Order
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/catalog"
              className="hidden lg:flex p-2 text-neutral-600 hover:text-neutral-900"
              aria-label="Search items"
            >
              <Search className="h-5 w-5" />
            </Link>

            <Link
              href="/login"
              className="p-2 text-neutral-600 hover:text-neutral-900"
              aria-label="My Account"
            >
              <User className="h-5 w-5" />
            </Link>

            <button
              onClick={onOpenCart}
              className="relative p-2 text-neutral-700 hover:text-rose-900 transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-900 text-[10px] sm:text-xs font-bold text-white shadow-sm">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <Link
            href="/catalog"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-sm font-semibold text-neutral-900 py-1"
          >
            All Products
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-neutral-600 hover:text-rose-900 py-1"
            >
              {cat.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <Link href="/track-order" onClick={() => setIsMobileMenuOpen(false)} className="text-rose-900 font-semibold">
              Track Order
            </Link>
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              Customer Login
            </Link>
            <Link href="https://www.instagram.com/theblingcorner_" target="_blank" rel="noopener noreferrer" className="text-rose-900 font-medium">
              Instagram @theblingcorner_
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

