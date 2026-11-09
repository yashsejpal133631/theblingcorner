"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { ProductReviews } from "@/components/storefront/ProductReviews";
import {
  ShoppingBag,
  Truck,
  ShieldCheck,
  ArrowLeft,
  Check,
  AlertTriangle,
  Minus,
  Plus,
} from "lucide-react";

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | string;
  comparePrice?: number | string | null;
  stockQuantity: number;
  weightGrams: number;
  category: { name: string; slug: string };
  images: Array<{ url: string; altText?: string | null }>;
  variants: Array<{ id: string; title: string; price?: number | null; stock: number }>;
}

function ProductDetailContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [product, setProduct] = React.useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = React.useState<ProductDetail[]>([]);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddedToCart, setIsAddedToCart] = React.useState(false);

  React.useEffect(() => {
    async function loadProduct() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();
        if (data.success && data.product) {
          setProduct(data.product);
          setRelatedProducts(data.relatedProducts || []);
          if (data.product.variants && data.product.variants.length > 0) {
            setSelectedVariantId(data.product.variants[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading product:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) loadProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-neutral-200 rounded-2xl w-full" />
          <div className="space-y-4 pt-4">
            <div className="h-4 bg-neutral-200 rounded w-1/4" />
            <div className="h-8 bg-neutral-200 rounded w-3/4" />
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-24 bg-neutral-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center flex-1">
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Product Not Found</h2>
        <p className="text-neutral-500 mb-6 text-sm">
          The item you are looking for is currently unavailable or has been removed.
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center px-4 py-2 bg-rose-900 text-white rounded-xl text-sm font-semibold hover:bg-rose-950"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const comparePrice = product.comparePrice
    ? typeof product.comparePrice === "string"
      ? parseFloat(product.comparePrice)
      : product.comparePrice
    : null;

  const discountPercent =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = !isOutOfStock && product.stockQuantity <= 3;
  const images = product.images.length > 0 ? product.images : [{ url: "/placeholder.svg" }];

  const handleAddToCart = () => {
    const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);
    const itemPrice = selectedVariant?.price
      ? typeof selectedVariant.price === "string"
        ? parseFloat(selectedVariant.price)
        : selectedVariant.price
      : price;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      variantTitle: selectedVariant?.title || null,
      title: product.title,
      slug: product.slug,
      price: itemPrice,
      comparePrice,
      imageUrl: images[0]?.url,
      quantity,
      weightGrams: product.weightGrams,
      stockQuantity: selectedVariant ? selectedVariant.stock : product.stockQuantity,
    });

    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-neutral-500 mb-6">
        <Link href="/" className="hover:text-neutral-900">
          Home
        </Link>
        <span>/</span>
        <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-neutral-900">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium truncate max-w-[200px]">
          {product.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images Section */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-neutral-200/80 shadow-sm">
            <Image
              src={images[activeImageIndex]?.url || "/placeholder.svg"}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
            {discountPercent && (
              <span className="absolute top-3 left-3 bg-rose-900 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Thumbnail Carousel */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeImageIndex === i ? "border-rose-900 shadow-sm" : "border-neutral-200 opacity-70"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="flex flex-col space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              {product.category.name}
            </span>
            <h1 className="text-xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-1">
              {product.title}
            </h1>
          </div>

          {/* Price Box */}
          <div className="flex items-baseline space-x-3 bg-white p-4 rounded-2xl border border-neutral-200/80">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900">
              {formatPrice(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-base text-neutral-400 line-through">
                {formatPrice(comparePrice)}
              </span>
            )}
            {discountPercent && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Save {discountPercent}%
              </span>
            )}
          </div>

          {/* Stock status & Shipping Weight */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {isOutOfStock ? (
              <span className="inline-flex items-center text-red-600 bg-red-50 px-3 py-1.5 rounded-xl font-semibold border border-red-200/80">
                <AlertTriangle className="h-4 w-4 mr-1.5" /> Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl font-semibold border border-amber-200/80">
                <AlertTriangle className="h-4 w-4 mr-1.5" /> Only {product.stockQuantity} Left in Stock!
              </span>
            ) : (
              <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl font-semibold border border-emerald-200/80">
                <Check className="h-4 w-4 mr-1.5" /> In Stock & Ready to Ship
              </span>
            )}

            <span className="inline-flex items-center text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-xl font-medium">
              <Truck className="h-3.5 w-3.5 mr-1.5" /> Est. Weight: {product.weightGrams}g
            </span>
          </div>

          {/* Variants (if applicable) */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Select Style / Variant:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                      selectedVariantId === variant.id
                        ? "border-rose-900 bg-rose-50 text-rose-950 font-semibold"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    {variant.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Quantity:
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex items-center border border-neutral-300 rounded-xl bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-neutral-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-xs text-neutral-400">
                  Max: {product.stockQuantity} items
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons (Desktop) */}
          <div className="hidden sm:flex gap-3 pt-2">
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 h-12 text-sm font-bold"
            >
              {isAddedToCart ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Added to Bag!
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-4 w-4" /> Add to Shopping Bag
                </>
              )}
            </Button>
          </div>

          {/* Description */}
          <div className="border-t border-neutral-200 pt-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Product Details
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Trust highlights */}
          <div className="rounded-2xl bg-neutral-100/70 p-4 space-y-2 text-xs text-neutral-600 border border-neutral-200/50">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700 flex-shrink-0" />
              <span>100% Guaranteed Handcrafted Quality</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-rose-900 flex-shrink-0" />
              <span>Prepaid Delivery Calculated Automatically at Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <ProductReviews productId={product.id} />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-10 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
              You May Also Like
            </h2>
            <Link
              href={`/catalog?category=${product.category.slug}`}
              className="text-xs font-semibold text-rose-900 hover:underline"
            >
              View all in {product.category.name} &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3 px-4 flex items-center justify-between shadow-lg">
        <div className="flex flex-col">
          <span className="text-[11px] text-neutral-400 font-medium">Price</span>
          <span className="text-base font-bold text-neutral-900">{formatPrice(price)}</span>
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          size="sm"
          className="px-6 h-10 text-xs font-bold"
        >
          {isAddedToCart ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Added!
            </>
          ) : (
            <>
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Add to Bag
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />
      <React.Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-12 w-full flex-1 animate-pulse">
            <div className="aspect-square bg-neutral-200 rounded-2xl max-w-md mx-auto" />
          </div>
        }
      >
        <ProductDetailContent />
      </React.Suspense>
      <Footer />
    </div>
  );
}
