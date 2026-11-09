"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { VendorNav } from "@/components/dashboard/VendorNav";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Plus,
  Minus,
  AlertCircle,
  Check,
  Search,
  PlusCircle,
  X,
  ExternalLink,
  Edit3,
  Upload,
  Loader2,
} from "lucide-react";
import { uploadProductImage } from "@/lib/storage";

interface ProductItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  comparePrice?: number;
  weightGrams: number;
  stockQuantity: number;
  thumbnailUrl: string;
  description?: string;
  category: {
    id?: string;
    name: string;
    slug: string;
  };
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export default function VendorProductsPage() {
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Add Product Form State
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newCategoryId, setNewCategoryId] = React.useState("");
  const [newPrice, setNewPrice] = React.useState("299");
  const [newWeight, setNewWeight] = React.useState("80");
  const [newStock, setNewStock] = React.useState("10");
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [createMessage, setCreateMessage] = React.useState<string | null>(null);
  const [isUploadingNew, setIsUploadingNew] = React.useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = React.useState<ProductItem | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editPrice, setEditPrice] = React.useState("");
  const [editComparePrice, setEditComparePrice] = React.useState("");
  const [editWeight, setEditWeight] = React.useState("");
  const [editStock, setEditStock] = React.useState("");
  const [editImageUrl, setEditImageUrl] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [editMessage, setEditMessage] = React.useState<string | null>(null);
  const [isUploadingEdit, setIsUploadingEdit] = React.useState(false);

  const handleUploadImage = async (file: File, isEdit: boolean) => {
    try {
      if (isEdit) setIsUploadingEdit(true);
      else setIsUploadingNew(true);

      const url = await uploadProductImage(file);
      if (isEdit) {
        setEditImageUrl(url);
      } else {
        setNewImageUrl(url);
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload image.");
    } finally {
      if (isEdit) setIsUploadingEdit(false);
      else setIsUploadingNew(false);
    }
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditPrice(p.price.toString());
    setEditComparePrice(p.comparePrice ? p.comparePrice.toString() : "");
    setEditWeight(p.weightGrams.toString());
    setEditStock(p.stockQuantity.toString());
    setEditImageUrl(p.thumbnailUrl || "");
    setEditDescription(p.description || "");
    setEditMessage(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setIsSavingEdit(true);
      setEditMessage(null);

      const res = await fetch(`/api/products/${editingProduct.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          price: Number(editPrice),
          comparePrice: editComparePrice ? Number(editComparePrice) : null,
          weightGrams: Number(editWeight),
          stockQuantity: Number(editStock),
          description: editDescription.trim(),
          images: editImageUrl.trim() ? [editImageUrl.trim()] : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditMessage(data.error || "Failed to update product.");
      } else {
        setEditMessage("Product updated successfully!");
        setProducts((prev) =>
          prev.map((item) =>
            item.slug === editingProduct.slug
              ? {
                  ...item,
                  title: editTitle.trim(),
                  price: Number(editPrice),
                  comparePrice: editComparePrice ? Number(editComparePrice) : undefined,
                  weightGrams: Number(editWeight),
                  stockQuantity: Number(editStock),
                  thumbnailUrl: editImageUrl.trim() || item.thumbnailUrl,
                  description: editDescription.trim(),
                }
              : item
          )
        );
        setTimeout(() => {
          setEditingProduct(null);
          setEditMessage(null);
        }, 600);
      }
    } catch {
      setEditMessage("Network error saving changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchProductsAndCategories = async () => {
    try {
      setIsLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products?limit=50"),
        fetch("/api/categories"),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
        if (catData.categories?.length > 0 && !newCategoryId) {
          setNewCategoryId(catData.categories[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load catalog data", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const handleUpdateStock = async (slug: string, newStock: number) => {
    if (newStock < 0) return;
    try {
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.slug === slug ? { ...p, stockQuantity: newStock } : p))
      );

      await fetch(`/api/products/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQuantity: newStock }),
      });
    } catch (err) {
      console.error("Stock update error:", err);
      fetchProductsAndCategories();
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCategoryId) return;

    try {
      setIsCreating(true);
      setCreateMessage(null);

      const defaultImage =
        newImageUrl.trim() ||
        "https://images.unsplash.com/photo-1611591475871-3f6280456108?auto=format&fit=crop&w=600&q=80";

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || `${newTitle.trim()} handcrafted with premium materials.`,
          price: Number(newPrice),
          weightGrams: Number(newWeight),
          stockQuantity: Number(newStock),
          categoryId: newCategoryId,
          images: [defaultImage],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateMessage(data.error || "Failed to create product.");
      } else {
        setCreateMessage("Product added successfully!");
        setNewTitle("");
        setNewDescription("");
        setNewImageUrl("");
        setShowAddForm(false);
        fetchProductsAndCategories();
      }
    } catch {
      setCreateMessage("Network error creating product.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col">
      <VendorNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200/80 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
              Products & Inventory Control
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Add new jewelry & accessories, set gram weights for shipping, and adjust stock counters.
            </p>
          </div>

          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs font-semibold rounded-xl bg-rose-900 hover:bg-rose-950 text-white gap-1.5 h-9 self-start sm:self-auto"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
            {showAddForm ? "Close Form" : "Add New Product"}
          </Button>
        </div>

        {/* Add Product Drawer / Panel */}
        {showAddForm && (
          <form
            onSubmit={handleCreateProduct}
            className="mt-6 p-6 bg-white border border-rose-200 rounded-2xl shadow-sm space-y-4 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-950">
                New Product Details
              </h2>
              <span className="text-[11px] text-neutral-500">* All prices authoritative</span>
            </div>

            {createMessage && (
              <div className="p-3 bg-neutral-100 rounded-xl text-xs font-medium text-neutral-800">
                {createMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Product Title *
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Starry Pearl Charm Bracelet"
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Category *
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-rose-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Selling Price (₹) *
                </label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Package Weight (Grams) *
                </label>
                <Input
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="e.g. 80"
                  required
                  className="h-10 text-xs rounded-xl font-mono"
                />
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  Used by the official physical shipping rate chart
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Stock Quantity *
                </label>
                <Input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Product Photo (100% Free Cloud Upload)
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://... (or choose a file from device)"
                    className="h-10 text-xs rounded-xl flex-1"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-rose-50 hover:border-rose-200 text-neutral-700 text-xs font-semibold shrink-0 transition-colors">
                    {isUploadingNew ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-800" />
                    ) : (
                      <Upload className="w-4 h-4 text-rose-800" />
                    )}
                    <span>{isUploadingNew ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingNew}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file, false);
                      }}
                    />
                  </label>
                </div>
                {newImageUrl && (
                  <span className="text-[10px] text-emerald-600 mt-1 block">
                    ✓ Photo uploaded and ready
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Handcrafted aesthetic accessory made with high quality beads..."
                rows={2}
                className="w-full p-3 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-rose-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
                className="text-xs h-9 rounded-xl text-neutral-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold h-9 rounded-xl px-5"
              >
                {isCreating ? "Adding..." : "Save Product to Store"}
              </Button>
            </div>
          </form>
        )}

        {/* Search & Counter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or category..."
              className="pl-9 h-9 text-xs rounded-xl border-neutral-300"
            />
          </div>
          <span className="text-xs font-medium text-neutral-500 self-start sm:self-auto">
            Showing {filteredProducts.length} items
          </span>
        </div>

        {/* Products Table / Cards */}
        <div className="mt-4 bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-800 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-medium text-neutral-500">Loading catalog items...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500">
                No products match your search.
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
                >
                  {/* Left: Thumbnail & info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative w-14 h-14 bg-neutral-100 rounded-xl overflow-hidden shrink-0">
                      <Image
                        src={p.thumbnailUrl || "/placeholder.svg"}
                        alt={p.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {p.title}
                        </span>
                        <Link
                          href={`/product/${p.slug}`}
                          target="_blank"
                          className="text-neutral-400 hover:text-neutral-700 shrink-0"
                          title="View live product page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                        <span className="bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-medium text-neutral-700">
                          {p.category?.name || "General"}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{p.weightGrams}g</span>
                        <span>•</span>
                        <span className="font-bold text-rose-950 font-serif">
                          {formatPrice(p.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stock Counter & Status */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-none border-neutral-100">
                    {/* Status badge */}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        p.stockQuantity === 0
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : p.stockQuantity <= 3
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {p.stockQuantity === 0
                        ? "Sold Out"
                        : p.stockQuantity <= 3
                        ? `Low: ${p.stockQuantity}`
                        : `Stock: ${p.stockQuantity}`}
                    </span>

                    {/* Quick +/- buttons */}
                    <div className="flex items-center border border-neutral-200 rounded-xl bg-white shadow-sm overflow-hidden h-9">
                      <button
                        onClick={() => handleUpdateStock(p.slug, p.stockQuantity - 1)}
                        disabled={p.stockQuantity <= 0}
                        className="px-2.5 h-full text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 transition-colors"
                        aria-label="Decrease stock by 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-mono font-bold text-neutral-900 min-w-8 text-center">
                        {p.stockQuantity}
                      </span>
                      <button
                        onClick={() => handleUpdateStock(p.slug, p.stockQuantity + 1)}
                        className="px-2.5 h-full text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                        aria-label="Increase stock by 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(p)}
                      className="inline-flex items-center gap-1 px-3 h-9 rounded-xl border border-neutral-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-neutral-700 hover:text-rose-900 text-xs font-semibold shadow-sm transition-all"
                      title="Edit product price, photo & details"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-rose-800" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 font-serif">
                    Edit Product Details
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Update price, photo URL, weight, and stock for {editingProduct.title}
                  </p>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    editMessage.includes("success")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {editMessage}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Product Title *
                  </label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Selling Price (₹) *
                    </label>
                    <Input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                      min="1"
                      className="h-10 text-xs rounded-xl font-mono font-bold text-rose-950"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Compare / Strike Price (₹)
                    </label>
                    <Input
                      type="number"
                      value={editComparePrice}
                      onChange={(e) => setEditComparePrice(e.target.value)}
                      placeholder="e.g. 299"
                      min="1"
                      className="h-10 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Weight in Grams *
                    </label>
                    <Input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      required
                      min="1"
                      className="h-10 text-xs rounded-xl font-mono"
                    />
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      Used for physical shipping tier calculation
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Current Stock Quantity *
                    </label>
                    <Input
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      required
                      min="0"
                      className="h-10 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Image / Photo (100% Free Cloud Upload)
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="https://... (or choose a photo from device)"
                      className="h-10 text-xs rounded-xl flex-1"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-rose-50 hover:border-rose-200 text-neutral-700 text-xs font-semibold shrink-0 transition-colors">
                      {isUploadingEdit ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-800" />
                      ) : (
                        <Upload className="w-4 h-4 text-rose-800" />
                      )}
                      <span>{isUploadingEdit ? "Uploading..." : "Upload"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingEdit}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImage(file, true);
                        }}
                      />
                    </label>
                    {editImageUrl && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                        <img
                          src={editImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1611591475871-3f6280456108?auto=format&fit=crop&w=600&q=80";
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Upload photos directly from your phone/PC or paste any web link.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Description & Craft Notes
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-rose-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingProduct(null)}
                    className="text-xs h-9 rounded-xl text-neutral-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingEdit}
                    className="bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold h-9 rounded-xl px-5"
                  >
                    {isSavingEdit ? "Saving Changes..." : "Save Product Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

