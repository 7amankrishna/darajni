import type { Metadata } from "next";

import { TrackingForm } from "@/components/order/tracking-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check a DARAJNI order using the order ID and matching phone number.",
};

export default function Page() {
  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <p className="eyebrow">Order tracking</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Track your DARAJNI order
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
            Enter the order ID from your confirmation and the same phone number
            used at checkout to see the latest status.
          </p>
        </div>
        <TrackingForm />
      </div>
    </main>
  );
}
