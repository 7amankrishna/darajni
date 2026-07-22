"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import type { OrderStatus, PaymentStatus } from "@/types/database";
import type { OrderSummary } from "@/types/commerce";

interface LiveOrdersState {
  orders: OrderSummary[];
  /** True when a Realtime channel is connected and pushing updates. */
  live: boolean;
}

type OrdersRow = {
  id: string;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  updated_at?: string;
};

/**
 * Keeps a signed-in customer's order list current without a manual refresh.
 *
 * Order progress is driven by `orders.status`, which advances as the admin or
 * the Shiprocket courier webhook moves an order forward. This hook subscribes to
 * Supabase Realtime for the current user's own rows (authorized by the existing
 * `orders_customer_read` RLS policy) and merges status changes into local state
 * so the timeline advances the moment the row changes. A brand-new order arrives
 * as an INSERT; because its items are not in the payload, we fall back to a
 * server refresh to load the complete order.
 *
 * Degrades gracefully: if Supabase is not configured, it simply returns the
 * server-rendered orders with `live: false`.
 */
export function useLiveOrders(
  initialOrders: OrderSummary[],
  userId: string | null | undefined,
): LiveOrdersState {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>(initialOrders);
  const [live, setLive] = useState(false);

  // Keep local state in sync when the server sends a fresh list (e.g. after
  // router.refresh() or a profile save that revalidates the page).
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) {
      setLive(false);
      return;
    }

    const channel = client
      .channel(`orders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as OrdersRow;
          if (!next?.id) return;
          setOrders((current) => {
            let changed = false;
            const merged = current.map((order) => {
              if (order.id !== next.id) return order;
              changed = true;
              return {
                ...order,
                status: next.status ?? order.status,
                paymentStatus: next.payment_status ?? order.paymentStatus,
                updatedAt: next.updated_at ?? order.updatedAt,
              };
            });
            // An update for an order not in the current view (e.g. placed on
            // another device) — reload from the server to pick it up in full.
            if (!changed) router.refresh();
            return merged;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${userId}`,
        },
        () => {
          // The INSERT payload has no order_items; refresh to load the full order.
          router.refresh();
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, router]);

  return { orders, live };
}
