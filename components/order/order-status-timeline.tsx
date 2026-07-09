import {
  Check,
  CircleDot,
  Package,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";

import type { OrderStatus } from "@/types/database";

const statuses: Array<{
  value: Exclude<OrderStatus, "cancelled">;
  label: string;
  icon: typeof CircleDot;
}> = [
  { value: "pending", label: "Pending", icon: CircleDot },
  { value: "confirmed", label: "Confirmed", icon: Check },
  { value: "packed", label: "Packed", icon: Package },
  { value: "shipped", label: "Shipped", icon: Truck },
  { value: "delivered", label: "Delivered", icon: PackageCheck },
];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-red-200">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-400/10">
            <X className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Order cancelled</p>
            <p className="mt-1 text-xs text-red-100/55">
              Contact support if you need help with this order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeIndex = statuses.findIndex((item) => item.value === status);

  return (
    <div className="grid grid-cols-5">
      {statuses.map((item, index) => {
        const Icon = item.icon;
        const complete = index <= activeIndex;
        return (
          <div key={item.value} className="relative text-center">
            {index > 0 && (
              <div
                className={`absolute right-1/2 top-5 h-px w-full ${
                  index <= activeIndex ? "bg-[#caaa70]" : "bg-white/12"
                }`}
              />
            )}
            <div
              className={`relative z-10 mx-auto grid h-10 w-10 place-items-center rounded-full border ${
                complete
                  ? "border-[#caaa70] bg-[#caaa70] text-black"
                  : "border-white/12 bg-[#11110f] text-white/70"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p
              className={`mt-3 text-[0.6rem] font-bold uppercase tracking-wider sm:text-xs ${
                complete ? "text-[#dfc184]" : "text-white/70"
              }`}
            >
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
