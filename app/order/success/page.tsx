import { CheckCircle2, MessageCircle, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusTimeline } from "@/components/order/order-status-timeline";
import { ClearCartAfterOrder } from "@/components/order/clear-cart-after-order";
import { formatPrice, whatsappSupportLink } from "@/config/site";
import {
  formatDate,
  getEstimatedDelivery,
} from "@/lib/commerce";
import { getStoreSettings } from "@/lib/data/catalog";
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
  const [order, settings] = await Promise.all([
    getOrderByAccessToken(token),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const estimate = getEstimatedDelivery(order.createdAt);
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    `Hello DARAJNI, I need help with order ${order.orderNumber}.`,
  );

  return (
    <main className="bg-background py-12 sm:py-16">
      <ClearCartAfterOrder />
      <div className="section-shell max-w-5xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <p className="eyebrow mt-5">
            {order.paymentMethod === "cod"
              ? "Order placed successfully"
              : "Payment confirmed"}
          </p>
          <h1 className="font-display mt-3 text-5xl leading-none text-text-primary sm:text-6xl">
            Thank you, {order.customerName.split(" ")[0]}.
          </h1>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            Your order ID is{" "}
            <strong className="select-all text-accent">
              {order.orderNumber}
            </strong>
            . Keep it with your phone number for tracking.
          </p>
        </div>

        <section className="mt-9 rounded-2xl border border-border bg-surface p-4 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-8">
          <OrderStatusTimeline status={order.status} />
          <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-4">
            <div>
              <p className="field-label">Order ID</p>
              <p className="text-sm font-semibold text-text-primary">{order.orderNumber}</p>
            </div>
            <div>
              <p className="field-label">Placed</p>
              <p className="text-sm text-text-secondary">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="field-label">Estimated delivery</p>
              <p className="text-sm text-text-secondary">
                {formatDate(estimate.earliest)} to {formatDate(estimate.latest)}
              </p>
            </div>
            <div>
              <p className="field-label">Payment</p>
              <p className="text-sm capitalize text-text-secondary">
                {order.paymentMethod === "cod"
                  ? "Cash on delivery"
                  : order.paymentStatus}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_50px_rgba(83,54,22,0.08)]">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="eyebrow">Order items</p>
          </div>
          <div className="divide-y divide-[#E9DCCB]">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-6"
              >
                <div className="min-w-0">
                  <p className="font-display text-2xl text-text-primary">
                    {item.productName}
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Size {item.selectedSize} | Quantity {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-display text-2xl font-semibold text-text-primary sm:text-right">
                  {formatPrice(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-5 sm:p-6">
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Promo discount{order.promoCode ? ` (${order.promoCode})` : ""}
                  </span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span>{formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Tax</span>
                <span>{formatPrice(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-semibold text-text-primary">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-surface-alt p-6">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-5 w-5 text-accent" />
            <h2 className="font-display text-3xl text-text-primary">
              What happens next?
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              "We confirm your order",
              "We collect measurements if needed",
              "We prepare and pack your outfit",
              "We ship and share tracking",
            ].map((step, index) => (
              <div key={step} className="rounded-xl bg-surface p-4 text-sm text-text-secondary">
                <span className="font-display text-2xl text-accent">
                  {index + 1}
                </span>
                <p className="mt-2">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login" className="primary-button">
            My Orders
          </Link>
          <Link href="/track" className="secondary-button">
            Track Order
          </Link>
          <Link href="/collection" className="secondary-button">
            Continue Shopping
          </Link>
          <a href={whatsappHref} className="whatsapp-button">
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
