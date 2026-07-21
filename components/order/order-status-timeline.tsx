import {
  Check,
  CircleDot,
  Package,
  PackageCheck,
  Ruler,
  Scissors,
  Truck,
  X,
} from "lucide-react";

import type { OrderStatus } from "@/types/database";

const steps = [
  { key: "placed", label: "Order placed", icon: CircleDot },
  { key: "payment", label: "Payment confirmed", icon: Check },
  { key: "measurements", label: "Measurements", icon: Ruler },
  { key: "preparation", label: "Preparation", icon: Scissors },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

const statusIndex: Record<Exclude<OrderStatus, "cancelled">, number> = {
  pending: 0,
  confirmed: 3,
  packed: 4,
  shipped: 5,
  delivered: 6,
};

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-red-800">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-500/10">
            <X className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Order cancelled</p>
            <p className="mt-1 text-xs text-red-800/70">
              Contact support if you need help with this order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeIndex = statusIndex[status] ?? 0;

  return (
    <div className="relative my-2">
      {/* Desktop Horizontal View */}
      <div className="hidden sm:grid sm:grid-cols-7 sm:gap-2">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isUpcoming = index > activeIndex;

          return (
            <div key={item.key} className="relative text-center">
              {index > 0 && (
                <div
                  className={`absolute right-1/2 top-4 -z-0 h-0.5 w-full ${
                    index <= activeIndex ? "bg-[#1FAF54]" : "bg-[#E8E2DA] dark:bg-[#3B3026]"
                  }`}
                />
              )}
              <div
                className={`relative z-10 mx-auto grid h-9 w-9 place-items-center rounded-full transition-all ${
                  isDone
                    ? "bg-[#1FAF54] text-white shadow-sm"
                    : isCurrent
                    ? "bg-[#1FAF54] text-white ring-4 ring-[#1FAF54]/30 animate-pulse"
                    : "border border-[#E8E2DA] bg-[#F9F9F9] dark:bg-[#241D17] text-[#666666] dark:border-[#3B3026] dark:bg-[#241D17] dark:text-[#B8A898]"
                }`}
              >
                {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
              </div>
              <p
                className={`mt-2 text-[0.65rem] font-bold uppercase tracking-tight ${
                  isDone || isCurrent
                    ? "text-[#1E1E1E] dark:text-[#F7EADB]"
                    : "text-[#666666] dark:text-[#B8A898]/70"
                }`}
              >
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile Vertical Stepper View with Clear Green Stage Indicators */}
      <div className="relative space-y-4 sm:hidden pl-2">
        {/* Vertical Connecting Line */}
        <div className="absolute left-[1.125rem] top-3 bottom-3 w-0.5 bg-[#E8E2DA] dark:bg-[#3B3026]" />

        {steps.map((item, index) => {
          const Icon = item.icon;
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={item.key} className="relative flex items-center gap-3.5 z-10">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all ${
                  isDone
                    ? "bg-[#1FAF54] text-white shadow-sm"
                    : isCurrent
                    ? "bg-[#1FAF54] text-white ring-4 ring-[#1FAF54]/30 animate-pulse"
                    : "border border-[#E8E2DA] bg-[#F9F9F9] dark:bg-[#241D17] text-[#666666] dark:border-[#3B3026] dark:bg-[#241D17] dark:text-[#B8A898]"
                }`}
              >
                {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
              </div>

              <div className="flex-1 rounded-xl border border-[#E8E2DA] bg-[#F9F9F9] dark:bg-[#241D17]/60 px-3.5 py-2.5 dark:border-[#3B3026] dark:bg-[#241D17]/60">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDone || isCurrent
                        ? "text-[#1E1E1E] dark:text-[#F7EADB]"
                        : "text-[#666666] dark:text-[#B8A898]"
                    }`}
                  >
                    {item.label}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-[#1FAF54]/15 px-2 py-0.5 text-[0.6rem] font-black uppercase text-[#1FAF54]">
                      Current Stage
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[0.65rem] font-bold text-[#1FAF54]">
                      Completed ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
