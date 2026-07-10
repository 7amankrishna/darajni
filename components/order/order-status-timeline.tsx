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
import type { MeasurementStatus } from "@/types/commerce";
import type { PaymentMethod, PaymentStatus } from "@/types/database";

const statusIndex: Record<Exclude<OrderStatus, "cancelled">, number> = {
  pending: 0,
  confirmed: 3,
  packed: 4,
  shipped: 5,
  delivered: 6,
};

export function OrderStatusTimeline({
  status,
  paymentMethod,
  paymentStatus,
  measurementStatuses = [],
}: {
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  measurementStatuses?: Array<MeasurementStatus | null>;
}) {
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

  const steps = [
    { key: "placed", label: "Order placed", icon: CircleDot },
    {
      key: "payment",
      label: paymentMethod === "cod" ? "COD selected" : "Payment received",
      icon: Check,
    },
    { key: "measurements", label: "Measurements approved", icon: Ruler },
    { key: "preparation", label: "Preparation", icon: Scissors },
    { key: "packed", label: "Packed", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: PackageCheck },
  ];
  const paymentComplete =
    paymentMethod === "cod" || paymentStatus === "paid";
  const measurementsComplete =
    measurementStatuses.length > 0 &&
    measurementStatuses.every((itemStatus) => itemStatus === "confirmed");
  const activeIndex =
    status === "pending"
      ? measurementsComplete
        ? 2
        : paymentComplete
          ? 1
          : 0
      : statusIndex[status];

  return (
    <div className="grid gap-5 sm:grid-cols-7">
      {steps.map((item, index) => {
        const Icon = item.icon;
        const complete = index <= activeIndex;
        return (
          <div key={item.key} className="relative text-center">
            {index > 0 && (
              <div
                className={`absolute right-1/2 top-5 hidden h-px w-full sm:block ${
                  index <= activeIndex ? "bg-[#B8893B]" : "bg-[#E9DCCB]"
                }`}
              />
            )}
            <div
              className={`relative z-10 mx-auto grid h-10 w-10 place-items-center rounded-full border ${
                complete
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#E9DCCB] bg-[#FFFDF8] text-[#8E8071]"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p
              className={`mt-3 text-[0.62rem] font-extrabold uppercase sm:text-[0.68rem] ${
                complete ? "text-[#171717]" : "text-[#8E8071]"
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
