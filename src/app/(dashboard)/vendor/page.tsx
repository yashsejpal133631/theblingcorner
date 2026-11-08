"use client";

import * as React from "react";
import Link from "next/link";
import { VendorNav } from "@/components/dashboard/VendorNav";
import { formatPrice } from "@/lib/utils";
import {
  IndianRupee,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Truck,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VendorStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalProducts: number;
}

export default function VendorDashboardPage() {
  const [stats, setStats] = React.useState<VendorStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalProducts: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/vendor/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch vendor statistics", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col">
      <VendorNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200/80 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
              Store Owner Overview
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Welcome back to <span className="font-semibold text-rose-950">The Bling Corner</span> operations dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/vendor/products">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold rounded-xl border-rose-200 text-rose-900 hover:bg-rose-50 gap-1.5 h-9"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Product
              </Button>
            </Link>
            <Link href="/vendor/orders">
              <Button
                size="sm"
                className="text-xs font-semibold rounded-xl bg-rose-900 hover:bg-rose-950 text-white gap-1.5 h-9"
              >
                <Package className="w-3.5 h-3.5" />
                Fulfill Orders
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-bold uppercase tracking-wider">Gross Sales</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-serif text-neutral-900 mt-3">
              {isLoading ? "—" : formatPrice(stats.totalRevenue)}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> 100% Prepaid via Razorpay
            </p>
          </div>

          {/* Pending Packing Orders */}
          <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-900">
              <span className="text-xs font-bold uppercase tracking-wider">Needs Packing</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-serif text-rose-950 mt-3">
              {isLoading ? "—" : stats.pendingOrders}
            </p>
            <Link
              href="/vendor/orders"
              className="text-[11px] text-rose-800 font-semibold hover:underline mt-1 inline-flex items-center gap-1"
            >
              Pack & Dispatch &rarr;
            </Link>
          </div>

          {/* Total Orders */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-serif text-neutral-900 mt-3">
              {isLoading ? "—" : stats.totalOrders}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Processed safely</p>
          </div>

          {/* Low / Out of Stock */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-bold uppercase tracking-wider">Low Stock Alerts</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-serif text-neutral-900 mt-3">
              {isLoading ? "—" : stats.lowStockProducts + stats.outOfStockProducts}
            </p>
            <Link
              href="/vendor/products"
              className="text-[11px] text-amber-700 font-semibold hover:underline mt-1 inline-flex items-center gap-1"
            >
              Update stock counters &rarr;
            </Link>
          </div>
        </div>

        {/* Workflow Action Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Quick Fulfillment Guide */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-rose-800" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                Fulfillment Protocol (Official Rate Chart)
              </h2>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Every parcel weight is calculated automatically at checkout based on your catalog weight inputs.
              When packaging orders:
            </p>
            <ul className="mt-3 space-y-2 text-xs text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                <span>Pack items in bubble mailers with safe protective wrap for jewelry and resin clips.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                <span>Mark order as <strong className="text-neutral-900">PACKED</strong> in the Order Ledger.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                <span>Hand parcel to courier (Speed Post / Delhivery) and enter the <strong className="text-neutral-900">AWB Tracking Number</strong> to notify the customer automatically.</span>
              </li>
            </ul>
            <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-between items-center">
              <Link
                href="/vendor/orders"
                className="text-xs font-bold text-rose-900 hover:text-rose-950 inline-flex items-center gap-1"
              >
                Go to Order Ledger <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Catalog & Inventory Control */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-rose-800" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                Instagram Catalog Sync
              </h2>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Whenever you showcase a new piece on Instagram stories or reels (@theblingcorner_), add it here to enable instant checkout.
            </p>
            <div className="mt-4 p-4 rounded-xl bg-rose-50/40 border border-rose-100 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-700">
                <span>Active Products:</span>
                <span className="font-bold text-neutral-900">{stats.totalProducts} items</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Zero-Cost Storage:</span>
                <span className="font-bold text-emerald-700">5 GB Firebase CDN Active</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Database:</span>
                <span className="font-bold text-emerald-700">Supabase PostgreSQL Connected</span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-between items-center">
              <Link
                href="/vendor/products"
                className="text-xs font-bold text-rose-900 hover:text-rose-950 inline-flex items-center gap-1"
              >
                Manage Inventory & Prices <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

