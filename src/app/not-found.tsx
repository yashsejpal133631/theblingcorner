import Link from "next/link";
import { Home, Search, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50/30 px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-neutral-900">
        This page slipped away
      </h1>
      <p className="mt-3 max-w-md text-sm text-neutral-600">
        The page you are looking for may have been moved, renamed, or never
        existed. Let&apos;s get you back to something sparkly.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-rose-900 text-white text-sm font-medium hover:bg-rose-950"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-rose-200 bg-white text-rose-950 text-sm font-medium hover:bg-rose-50"
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Catalog
        </Link>
        <Link
          href="/track-order"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-neutral-300 bg-white text-neutral-800 text-sm font-medium hover:bg-neutral-50"
        >
          <Search className="w-4 h-4" />
          Track an Order
        </Link>
      </div>
    </div>
  );
}
