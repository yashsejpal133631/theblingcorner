"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Sparkles, SlidersHorizontal, ArrowUpDown, X, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { ProductCard, type ProductCardProps } from "@/components/storefront/ProductCard";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = React.useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [sortBy, setSortBy] = React.useState<string>("relevance");
  const [products, setProducts] = React.useState<ProductCardProps["product"][]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Sync state if URL query changes
  React.useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  React.useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (query.trim()) params.set("search", query.trim());
        if (selectedCategory !== "ALL") params.set("category", selectedCategory);
        if (sortBy !== "relevance") params.set("sort", sortBy);

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.products) {
          setProducts(data.products);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedCategory, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const categories = [
    { label: "All Items", value: "ALL" },
    { label: "Keychains", value: "keychains" },
    { label: "Hair Clips", value: "hair-clips" },
    { label: "Stationery", value: "stationery" },
    { label: "Bracelets", value: "bracelets" },
    { label: "Charms", value: "charms" },
    { label: "Wipes", value: "wipes" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Search Header Form */}
        <div className="max-w-3xl mx-auto mb-8 text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-neutral-900">
            Search Handcrafted Collection
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Find bells, phone charms, evil eye bracelets, pastel clips, and cute stationery
          </p>

          <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name, charm color, or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-neutral-300 py-3 pl-11 pr-10 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:border-rose-800 shadow-sm bg-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat.value
                    ? "bg-rose-900 text-white shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:border-rose-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Bar & Sort Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-neutral-200/80 gap-3 text-xs">
          <p className="text-neutral-600">
            {isLoading ? (
              <span>Searching our collection...</span>
            ) : (
              <span>
                Showing <strong>{products.length}</strong> {products.length === 1 ? "result" : "results"}{" "}
                {query ? (
                  <span>
                    for "<strong>{query}</strong>"
                  </span>
                ) : null}
              </span>
            )}
          </p>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-neutral-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-neutral-300 rounded-xl px-2.5 py-1 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-800 font-medium"
            >
              <option value="relevance">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 py-12 text-center">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse bg-white rounded-2xl p-4 border border-neutral-200 space-y-3">
                <div className="h-44 bg-neutral-200 rounded-xl" />
                <div className="h-4 bg-neutral-200 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-neutral-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center mx-auto">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">No matching accessories found</h3>
              <p className="text-xs text-neutral-500">
                Try searching with a broader word like "charm", "bead", or "bell", or browse all items.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedCategory("ALL");
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-900 text-white text-xs font-bold hover:bg-rose-950 transition-colors shadow-xs"
              >
                Clear Filters & Show All
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900" />
            <p className="text-xs text-neutral-600 font-medium">Loading search...</p>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </React.Suspense>
  );
}
