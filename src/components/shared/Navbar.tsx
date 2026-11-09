"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ShoppingBag, User, Search, Menu, X, LogOut, Shield } from "lucide-react";
import { GoogleIcon } from "@/components/ui/icons";
import { useCart } from "@/context/CartContext";

interface NavbarProps {
  cartItemCount?: number;
  onOpenCart?: () => void;
}

interface UserSession {
  id: string;
  name: string | null;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN";
  image?: string | null;
}

export function Navbar({ cartItemCount: propCount, onOpenCart: propOpen }: NavbarProps) {
  const { itemCount: contextCount, openCart: contextOpen } = useCart();
  const cartItemCount = propCount !== undefined ? propCount : contextCount;
  const onOpenCart = propOpen !== undefined ? propOpen : contextOpen;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<UserSession | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  // Check authentication session
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn("Failed to check auth state in navbar:", err);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setIsUserMenuOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const categories = [
    { name: "Keychains", href: "/catalog?category=keychains" },
    { name: "Hair Clips", href: "/catalog?category=hair-clips" },
    { name: "Stationery", href: "/catalog?category=stationery" },
    { name: "Bracelets", href: "/catalog?category=bracelets" },
    { name: "Charms", href: "/catalog?category=charms" },
    { name: "Wipes", href: "/catalog?category=wipes" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      {/* Announcement Bar */}
      <div className="bg-rose-900 text-white text-[11px] sm:text-xs text-center py-1.5 px-4 font-medium tracking-wide">
        ✨ 100% Handcrafted Aesthetic Accessories • Free Delivery on Orders Across India!
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

          {/* Right Action Icons & Login */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/catalog"
              className="hidden lg:flex p-2 text-neutral-600 hover:text-neutral-900"
              aria-label="Search items"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* User Account / Google Sign In */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-rose-200 transition-all"
                  aria-label="User Menu"
                >
                  {currentUser.image ? (
                    <div className="relative h-8 w-8 rounded-full overflow-hidden border border-rose-200">
                      <Image
                        src={currentUser.image}
                        alt={currentUser.name || "User"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-rose-900 text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 py-1.5 z-50 animate-in fade-in">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {currentUser.name || "Customer"}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {currentUser.email}
                      </p>
                    </div>

                    {currentUser.role === "SUPER_ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                      >
                        <Shield className="w-3.5 h-3.5 text-rose-800" /> Admin Console
                      </Link>
                    )}

                    {currentUser.role === "VENDOR" && (
                      <Link
                        href="/vendor"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                      >
                        <Shield className="w-3.5 h-3.5 text-rose-800" /> Vendor Dashboard
                      </Link>
                    )}

                    <Link
                      href="/track-order"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                    >
                      <User className="w-3.5 h-3.5" /> My Orders & Tracking
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left border-t border-neutral-100"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-neutral-300 hover:border-rose-400 bg-white hover:bg-rose-50/50 text-xs font-bold text-neutral-800 shadow-xs transition-all active:scale-95"
                title="Sign in with Google"
              >
                <GoogleIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden text-[11px]">Sign In</span>
              </Link>
            )}

            {/* Shopping Bag Icon */}
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
          {/* Mobile Google Sign In CTA */}
          {!currentUser ? (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-neutral-300 bg-neutral-50 hover:bg-rose-50 font-bold text-xs text-neutral-800 shadow-xs transition-all"
            >
              <GoogleIcon className="h-4 w-4" />
              <span>Sign In with Google</span>
            </Link>
          ) : (
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-950">{currentUser.name || "Customer"}</p>
                <p className="text-[11px] text-neutral-500">{currentUser.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Sign Out
              </button>
            </div>
          )}

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
            <Link href="https://www.instagram.com/theblingcorner_" target="_blank" rel="noopener noreferrer" className="text-rose-900 font-medium">
              Instagram @theblingcorner_
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
