import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusTimeline } from "@/components/order/order-status-timeline";
import { formatPrice } from "@/config/site";
import {
  formatDate,
  getEstimatedDelivery,
} from "@/lib/commerce";
import { getOrderByAccessToken } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();
  const order = await getOrderByAccessToken(token);
  if (!order) notFound();

  const estimate = getEstimatedDelivery(order.createdAt);

  return (
    <main className="py-12 sm:py-16">
      <div className="section-shell max-w-4xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#caaa70]" />
          <p className="eyebrow mt-5">
            {order.paymentMethod === "cod"
              ? "Order received"
              : "Payment confirmed"}
          </p>
          <h1 className="font-display mt-3 text-5xl sm:text-6xl">
            Thank you, {order.customerName.split(" ")[0]}.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/48">
            Your order ID is{" "}
            <strong className="select-all text-[#dfc184]">
              {order.orderNumber}
            </strong>
            . Keep it with your phone number for tracking.
          </p>
        </div>

        <section className="glass-panel mt-9 p-5 sm:p-8">
          <OrderStatusTimeline status={order.status} />
          <div className="mt-8 grid gap-4 border-t border-white/9 pt-6 sm:grid-cols-3">
            <div>
              <p className="field-label">Placed</p>
              <p className="text-sm">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="field-label">Estimated delivery</p>
              <p className="text-sm">
                {formatDate(estimate.earliest)} – {formatDate(estimate.latest)}
              </p>
            </div>
            <div>
              <p className="field-label">Payment</p>
              <p className="text-sm capitalize">
                {order.paymentMethod === "cod"
                  ? "Cash on delivery"
                  : order.paymentStatus}
              </p>
            </div>
          </div>
        </section>

        <section className="glass-panel mt-6 overflow-hidden">
          <div className="border-b border-white/9 p-5 sm:p-6">
            <p className="eyebrow">Order items</p>
          </div>
          <div className="divide-y divide-white/8">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-5 p-5 sm:p-6"
              >
                <div>
                  <p className="font-display text-xl">{item.productName}</p>
                  <p className="mt-2 text-xs text-white/40">
                    Size {item.selectedSize} · Quantity {item.quantity}
                  </p>
                </div>
                <p className="font-display text-xl text-[#dfc184]">
                  {formatPrice(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-white/9 p-5 sm:p-6">
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-white/50">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-200">
                  <span>
                    Promo discount{order.promoCode ? ` (${order.promoCode})` : ""}
                  </span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white/50">
                <span>Shipping</span>
                <span>{formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Tax</span>
                <span>{formatPrice(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-white/9 pt-3 font-semibold">
                <span>Total</span>
                <span className="text-[#dfc184]">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/track" className="primary-button">
            Track this order
          </Link>
          <Link href="/#collection" className="secondary-button">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
