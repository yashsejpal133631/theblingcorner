"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  LogOut,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  Printer,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { GoogleIcon } from "@/components/ui/icons";

interface OrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  trackingNumber?: string | null;
  courierPartner?: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: number;
    imageUrl: string;
    productSlug: string;
  }>;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [orders, setOrders] = React.useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAccountData() {
      try {
        setIsLoading(true);
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (!meRes.ok || !meData.authenticated) {
          router.push("/login?redirect=/account");
          return;
        }

        setUser(meData.user);

        // Fetch recent orders
        const ordersRes = await fetch("/api/account/orders");
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.orders) {
            setOrders(ordersData.orders);
          }
        }
      } catch (err) {
        console.error("Account data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAccountData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50/50">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900 mb-4" />
          <p className="text-xs text-neutral-500">Loading your account details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl border border-rose-100 p-6 sm:p-8 shadow-sm mb-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {user.image ? (
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 border-rose-200 shadow-sm flex-shrink-0">
                <Image src={user.image} alt={user.name || "Customer"} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-rose-900 text-white flex items-center justify-center text-xl sm:text-2xl font-bold font-serif flex-shrink-0 shadow-sm">
                {user.name ? user.name[0].toUpperCase() : "C"}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
                  {user.name || "Customer"}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-900 border border-rose-100">
                  <Sparkles className="h-2.5 w-2.5 mr-1" /> Customer
                </span>
              </div>
              <p className="text-xs text-neutral-500">{user.email}</p>
              {user.phone && <p className="text-xs text-neutral-500">📱 {user.phone}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/catalog"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-900 text-white text-xs font-bold hover:bg-rose-950 transition-colors shadow-xs"
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Continue Shopping
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 text-xs font-semibold transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Account Quick Stats / Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Orders</span>
            <p className="text-2xl font-extrabold text-neutral-900 font-serif">{orders.length}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Shipments</span>
            <p className="text-2xl font-extrabold text-rose-900 font-serif">
              {orders.filter((o) => o.status === "PROCESSING" || o.status === "SHIPPED").length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Payment Support</span>
            <p className="text-xs text-neutral-600 pt-1">
              Direct UPI Verified • Pan-India Free Delivery on Selected Collections
            </p>
          </div>
        </div>

        {/* Orders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 font-serif flex items-center gap-2">
              <Package className="h-5 w-5 text-rose-900" />
              <span>Order History & Tracking</span>
            </h2>
            <Link
              href="/track-order"
              className="text-xs font-semibold text-rose-900 hover:underline inline-flex items-center gap-1"
            >
              Public Parcel Tracker &rarr;
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-10 text-center space-y-4 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center mx-auto">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">No Orders Placed Yet</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Looks like you haven't bought any sparkly jewelry yet. Explore our handcrafted collections!
                </p>
              </div>
              <Link
                href="/catalog"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-rose-900 text-white text-xs font-bold hover:bg-rose-950 transition-colors shadow-xs"
              >
                Browse Catalog &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusStyles: Record<string, string> = {
                  PENDING_PAYMENT: "bg-amber-50 text-amber-800 border-amber-200",
                  PAID: "bg-blue-50 text-blue-800 border-blue-200",
                  PROCESSING: "bg-purple-50 text-purple-800 border-purple-200",
                  SHIPPED: "bg-emerald-50 text-emerald-800 border-emerald-200",
                  DELIVERED: "bg-green-50 text-green-800 border-green-200",
                  CANCELLED: "bg-red-50 text-red-800 border-red-200",
                };

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs text-neutral-400 font-medium">Order Number</span>
                        <p className="text-sm font-bold text-neutral-900 font-mono">{order.orderNumber}</p>
                        <p className="text-[11px] text-neutral-400">
                          Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            statusStyles[order.status] || "bg-neutral-100 text-neutral-800"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-extrabold text-neutral-900">
                          ₹{order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                              <Image
                                src={item.imageUrl}
                                alt={item.productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900">{item.productName}</p>
                              <p className="text-neutral-400 text-[11px]">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-bold text-neutral-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons: Tracking & Invoice */}
                    <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        {order.trackingNumber ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Truck className="h-3.5 w-3.5" />
                            <span>
                              {order.courierPartner || "Courier"} AWB: <strong>{order.trackingNumber}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">
                            {order.status === "PENDING_PAYMENT"
                              ? "Payment confirmation in progress"
                              : "Tracking will be assigned upon dispatch"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-semibold text-xs transition-colors"
                        >
                          <ExternalLink className="h-3 w-3 mr-1.5" /> Live Track
                        </Link>
                        <Link
                          href={`/invoice/${encodeURIComponent(order.orderNumber)}`}
                          target="_blank"
                          className="inline-flex items-center px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs transition-colors"
                        >
                          <Printer className="h-3 w-3 mr-1.5" /> Receipt / Invoice
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

