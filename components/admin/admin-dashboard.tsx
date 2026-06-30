"use client";

import {
  BarChart3,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { OrderManagement } from "@/components/admin/order-management";
import { ProductManagement } from "@/components/admin/product-management";
import { PromoManagement } from "@/components/admin/promo-management";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { supabase } from "@/lib/supabase/client";
import type { AdminDashboardData } from "@/types/admin";

type Tab = "analytics" | "orders" | "products" | "promos" | "settings";

const tabs: Array<{ value: Tab; label: string; icon: typeof BarChart3 }> = [
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "orders", label: "Orders", icon: ShoppingBag },
  { value: "products", label: "Products", icon: Package },
  { value: "promos", label: "Promos", icon: Tag },
  { value: "settings", label: "Settings", icon: Settings },
];

export function AdminDashboard({
  data,
  email,
}: {
  data: AdminDashboardData;
  email: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("analytics");

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-[75vh] py-10 sm:py-14">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">DARAJNI administration</p>
            <h1 className="font-display mt-3 text-5xl sm:text-6xl">
              Store dashboard
            </h1>
            <p className="mt-3 text-sm text-white/40">
              Signed in as {email}
            </p>
          </div>
          <button type="button" onClick={() => void signOut()} className="secondary-button">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <div className="-mx-2 mt-8 flex gap-2 overflow-x-auto px-2 pb-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => setTab(item.value)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-xs font-bold uppercase tracking-wider transition ${
                  tab === item.value
                    ? "border-[#caaa70] bg-[#caaa70] text-black"
                    : "border-white/10 text-white/50 hover:border-[#caaa70]/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.value === "orders" && data.analytics.activeOrders > 0 && (
                  <span className="rounded-full bg-black/15 px-2 py-0.5">
                    {data.analytics.activeOrders}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <section className="mt-8">
          {tab === "analytics" && <AnalyticsPanel analytics={data.analytics} />}
          {tab === "orders" && <OrderManagement orders={data.orders} />}
          {tab === "products" && (
            <ProductManagement
              products={data.products}
              categories={data.categories}
            />
          )}
          {tab === "promos" && <PromoManagement promos={data.promos} />}
          {tab === "settings" && <SettingsPanel settings={data.settings} />}
        </section>
      </div>
    </main>
  );
}
