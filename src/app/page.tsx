"use client";

import * as React from "react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductCardProps } from "@/components/storefront/ProductCard";
import { Sparkles, ArrowRight } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = React.useState<ProductCardProps["product"][]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadFeatured() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/products?limit=8&sort=featured");
        const data = await res.json();
        if (data.success && data.products) {
          setFeaturedProducts(data.products);
        }
      } catch (err) {
        console.error("Failed to load featured products:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFeatured();
  }, []);

  const categories = [
    { title: "Keychains", slug: "keychains", desc: "Cute bells & lamps", icon: "✨" },
    { title: "Hair Clips", slug: "hair-clips", desc: "Pearls & character clips", icon: "🌸" },
    { title: "Stationery", slug: "stationery", desc: "Diaries & gel pens", icon: "📓" },
    { title: "Bracelets", slug: "bracelets", desc: "Glass bead & evil eye", icon: "💎" },
    { title: "Charms", slug: "charms", desc: "Phone & bag charms", icon: "🎀" },
    { title: "Wipes", slug: "wipes", desc: "Aesthetic pocket wipes", icon: "🍃" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/80 via-white to-neutral-50/50 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-rose-100/60">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
            <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Online Store of The Bling Corner</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 tracking-tight font-serif">
              Trendy Handcrafted <br />
              <span className="text-rose-900 italic">Bling & Accessories</span>
            </h1>

            <p className="text-xs sm:text-base text-neutral-600 max-w-xl mx-auto leading-relaxed">
              Discover cute phone charms, beaded bracelets, resin hair accessories, and aesthetic stationery. Shop safely with 100% prepaid online checkout.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/catalog"
                className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-2xl bg-rose-900 text-white text-sm font-bold hover:bg-rose-950 transition-all shadow-sm active:scale-95"
              >
                Shop All Items <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="https://www.instagram.com/theblingcorner_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-neutral-300 text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-all"
              >
                <InstagramIcon className="mr-2 h-4 w-4 text-rose-800" /> Follow on Instagram
              </Link>
            </div>
          </div>
        </section>

        {/* Category Carousel / Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Curated Collections
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                Explore our signature handcrafted categories
              </p>
            </div>
            <Link
              href="/catalog"
              className="text-xs font-semibold text-rose-900 hover:underline"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/catalog?category=${cat.slug}`}
                className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-neutral-200/80 hover:border-rose-900/50 hover:shadow-md transition-all text-center"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-rose-900 transition-colors">
                  {cat.title}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5">
                  {cat.desc}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Best Sellers */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-neutral-200/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Trending & Best Sellers
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                Loved by our Instagram community
              </p>
            </div>
            <Link
              href="/catalog"
              className="text-xs font-semibold text-rose-900 hover:underline"
            >
              Browse Full Catalog &rarr;
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-neutral-200 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200/80 p-6">
              <p className="text-xs sm:text-sm text-neutral-500">
                Products are being refreshed. Check back shortly!
              </p>
              <Link
                href="/catalog"
                className="mt-3 inline-flex items-center text-xs font-bold text-rose-900 hover:underline"
              >
                Go to Catalog &rarr;
              </Link>
            </div>
          )}
        </section>

        {/* Instagram Bio Banner */}
        <section className="bg-rose-900 text-white py-12 px-4 sm:px-6 lg:px-8 text-center my-8">
          <div className="max-w-xl mx-auto space-y-3">
            <InstagramIcon className="h-8 w-8 mx-auto text-rose-200" />
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Order Directly From Instagram
            </h3>
            <p className="text-xs sm:text-sm text-rose-100">
              Found an item on our reels or stories? Simply browse the catalog, choose your quantity, and checkout online. We deliver directly to your doorstep.
            </p>
            <div className="pt-2">
              <Link
                href="https://www.instagram.com/theblingcorner_"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2.5 rounded-xl bg-white text-rose-900 text-xs sm:text-sm font-bold hover:bg-rose-50 transition-colors shadow-sm"
              >
                Visit @theblingcorner_
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
