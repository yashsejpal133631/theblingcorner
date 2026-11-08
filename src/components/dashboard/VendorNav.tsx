"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, Package, ShoppingBag, ArrowLeft, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VendorNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const navLinks = [
    { name: "Overview", href: "/vendor" },
    { name: "Orders & Dispatch", href: "/vendor/orders" },
    { name: "Products & Stock", href: "/vendor/products" },
  ];

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Badge */}
          <div className="flex items-center space-x-3">
            <Link href="/vendor" className="flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-900 text-white font-bold">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-serif font-bold text-neutral-900 text-base sm:text-lg">
                The Bling Corner
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 bg-rose-50 text-rose-800 text-[11px] font-bold uppercase tracking-wider rounded-md border border-rose-200">
              Store Owner Portal
            </span>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-rose-900 text-white"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Tools */}
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              target="_blank"
              className="text-neutral-600 hover:text-neutral-900 text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            >
              <span>Live Store</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-neutral-500 hover:text-red-700 hover:bg-red-50 text-xs h-8 px-2.5 rounded-lg gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex border-t border-neutral-100 py-2 space-x-2 overflow-x-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-rose-900 text-white"
                    : "text-neutral-600 bg-neutral-100"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

