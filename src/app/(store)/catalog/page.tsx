"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { CategoryPills } from "@/components/storefront/CategoryPills";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { ProductCardProps } from "@/components/storefront/ProductCard";
import { Search, SlidersHorizontal } from "lucide-react";

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [categories, setCategories] = React.useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [products, setProducts] = React.useState<ProductCardProps["product"][]>([]);
  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const [sortBy, setSortBy] = React.useState("featured");
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load categories
  React.useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch filtered products
  React.useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (currentCategory && currentCategory !== "all") {
          params.set("category", currentCategory);
        }
        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }
        if (sortBy) {
          params.set("sort", sortBy);
        }
        if (inStockOnly) {
          params.set("inStock", "true");
        }

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);

    return () => clearTimeout(timer);
  }, [currentCategory, searchTerm, sortBy, inStockOnly]);

  const handleSelectCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    router.push(`/catalog?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1">
        {/* Header Title */}
        <div className="mb-6 space-y-1">
          <h1 className="text-xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Shop Aesthetic Accessories
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Handcrafted charms, bracelets, keychains, and stationery curated for you
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keychains, hair clips, charms, diary..."
                className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm placeholder:text-neutral-400 focus:outline-none focus:border-rose-900 focus:ring-1 focus:ring-rose-900"
              />
            </div>

            {/* Sort & In-Stock */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-11 pl-3 pr-8 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-700 appearance-none focus:outline-none focus:border-rose-900 cursor-pointer"
                >
                  <option value="featured">Featured First</option>
                  <option value="newest">Newest Additions</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
                <SlidersHorizontal className="absolute right-3 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>

              <button
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`h-11 px-3 sm:px-4 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  inStockOnly
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                In Stock Only
              </button>
            </div>
          </div>

          {/* Category Horizontal Pills */}
          <CategoryPills
            categories={categories}
            selectedCategory={currentCategory}
            onSelectCategory={handleSelectCategory}
          />
        </div>

        {/* Product Grid */}
        <ProductGrid
          products={products}
          isLoading={isLoading}
          onClearFilters={() => {
            setSearchTerm("");
            setInStockOnly(false);
            router.push("/catalog");
          }}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-neutral-50/50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-12 w-full flex-1 animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-1/3" />
            <div className="h-11 bg-neutral-200 rounded w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-neutral-200 rounded-2xl" />
              ))}
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <CatalogContent />
    </React.Suspense>
  );
}

