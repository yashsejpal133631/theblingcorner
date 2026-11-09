"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UpiPaymentQueue } from "@/components/dashboard/UpiPaymentQueue";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  LogOut,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

export default function AdminPaymentsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-700 text-white font-bold">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <span className="font-serif font-bold text-white text-base sm:text-lg">
                  UPI Payment Verification
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded font-mono border border-rose-800">
                  ROOT PRIVILEGES
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/admin"
                className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Admin Console</span>
              </Link>
              <Link
                href="/vendor/payments"
                className="hidden sm:flex text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 items-center gap-1"
              >
                <span>Store Owner View</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-neutral-400 hover:text-red-400 text-xs h-8 px-2.5 rounded-lg gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-sm">
          <UpiPaymentQueue
            title="Direct UPI Payment Queue"
            subtitle="Every Direct UPI order waits here until its 12-digit UTR is matched against the store's bank statement. Approving marks the order PAID; rejecting cancels the order and releases reserved stock."
            backHref="/admin"
          />
        </div>
      </main>
    </div>
  );
}
