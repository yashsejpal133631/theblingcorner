"use client";

import * as React from "react";
import { VendorNav } from "@/components/dashboard/VendorNav";
import { UpiPaymentQueue } from "@/components/dashboard/UpiPaymentQueue";

export default function VendorPaymentsPage() {
  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col">
      <VendorNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-sm">
          <UpiPaymentQueue
            title="UPI Payment Verification"
            subtitle="Match each 12-digit UTR against the bank statement before approving. Approving marks the order PAID; rejecting cancels the order and returns the reserved stock."
            backHref="/vendor"
          />
        </div>
      </main>
    </div>
  );
}
