import {
  AlertTriangle,
  IndianRupee,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { formatPrice } from "@/config/site";
import type { AnalyticsSummary } from "@/types/admin";

export function AnalyticsPanel({ analytics }: { analytics: AnalyticsSummary }) {
  const cards = [
    {
      label: "Orders today",
      value: String(analytics.dailyOrders),
      icon: ShoppingBag,
    },
    {
      label: "Orders this week",
      value: String(analytics.weeklyOrders),
      icon: PackageCheck,
    },
    {
      label: "Revenue today",
      value: formatPrice(analytics.dailyRevenue),
      icon: IndianRupee,
    },
    {
      label: "Revenue this week",
      value: formatPrice(analytics.weeklyRevenue),
      icon: TrendingUp,
    },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="glass-panel p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  {card.label}
                </p>
                <Icon className="h-4 w-4 text-[#B8893B]" />
              </div>
              <p className="font-display mt-4 text-4xl text-[#D9B56B]">
                {card.value}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="glass-panel p-6">
          <p className="eyebrow">Top products</p>
          <div className="mt-5 space-y-3">
            {analytics.topProducts.length ? (
              analytics.topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl text-[#B8893B]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {product.quantity} item{product.quantity === 1 ? "" : "s"} sold
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#D9B56B]">
                    {formatPrice(product.revenue)}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-text-secondary">
                Sales data will appear after orders are placed.
              </p>
            )}
          </div>
        </section>

        <section className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Low stock alerts</p>
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-5 space-y-3">
            {analytics.lowStock.length ? (
              analytics.lowStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-border p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {product.category.name}
                    </p>
                  </div>
                  <span
                    className={`status-pill ${
                      product.stock === 0
                        ? "bg-red-400/10 text-red-200"
                        : "bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {product.stock} left
                  </span>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-text-secondary">
                All active products have healthy stock.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
