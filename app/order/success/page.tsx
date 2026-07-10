import { CheckCircle2, MessageCircle, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusTimeline } from "@/components/order/order-status-timeline";
import { formatPrice, whatsappSupportLink } from "@/config/site";
import {
  formatDate,
  getEstimatedDelivery,
} from "@/lib/commerce";
import { getStoreSettings } from "@/lib/data/catalog";
import { getOrderByAccessToken } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "Order placed",
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
    <main className="bg-[#FFF8EF] py-12 sm:py-16">
      <div className="section-shell max-w-5xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1FAF54]" />
          <p className="eyebrow mt-5">
            {order.paymentMethod === "cod"
              ? "Order placed successfully"
              : "Payment confirmed"}
          </p>
          <h1 className="font-display mt-3 text-5xl leading-none text-[#171717] sm:text-6xl">
            Thank you, {order.customerName.split(" ")[0]}.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#6F6255]">
            Your order ID is{" "}
            <strong className="select-all text-[#6E0F1A]">
              {order.orderNumber}
            </strong>
            . Keep it with your phone number for tracking.
          </p>
        </div>

        <section className="mt-9 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-8">
          <OrderStatusTimeline
            status={order.status}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
            measurementStatuses={order.items.map((item) => item.measurementStatus)}
          />
          <div className="mt-8 grid gap-4 border-t border-[#E9DCCB] pt-6 sm:grid-cols-4">
            <div>
              <p className="field-label">Order ID</p>
              <p className="text-sm font-semibold text-[#171717]">{order.orderNumber}</p>
            </div>
            <div>
              <p className="field-label">Placed</p>
              <p className="text-sm text-[#5F5348]">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="field-label">Estimated delivery</p>
              <p className="text-sm text-[#5F5348]">
                {formatDate(estimate.earliest)} to {formatDate(estimate.latest)}
              </p>
            </div>
            <div>
              <p className="field-label">Payment</p>
              <p className="text-sm capitalize text-[#5F5348]">
                {order.paymentMethod === "cod"
                  ? "Cash on delivery"
                  : order.paymentStatus}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] shadow-[0_18px_50px_rgba(83,54,22,0.08)]">
          <div className="border-b border-[#E9DCCB] p-5 sm:p-6">
            <p className="eyebrow">Order items</p>
          </div>
          <div className="divide-y divide-[#E9DCCB]">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-5 p-5 sm:p-6"
              >
                <div>
                  <p className="font-display text-2xl text-[#171717]">
                    {item.productName}
                  </p>
                  <p className="mt-2 text-xs text-[#6F6255]">
                    Size {item.selectedSize} | Quantity {item.quantity}
                  </p>
                  {item.measurements && (
                    <div className="mt-3 rounded-xl bg-[#F6E9DD] p-3 text-xs leading-5 text-[#5F5348]">
                      <p>
                        Shoulder {item.measurements.shoulder} · Bust {item.measurements.bust} · Waist {item.measurements.waist} · Hips {item.measurements.hips} · Length {item.measurements.outfitLength} in
                      </p>
                      <p className="mt-1 font-semibold capitalize">
                        Measurement review: {item.measurementStatus?.replace("_", " ")}
                      </p>
                    </div>
                  )}
                </div>
                <p className="font-display text-2xl font-semibold text-[#171717]">
                  {formatPrice(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E9DCCB] p-5 sm:p-6">
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-[#6F6255]">
                <span>Items subtotal</span>
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
              <div className="flex justify-between text-[#6F6255]">
                <span>Shipping</span>
                <span>{formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-[#6F6255]">
                <span>GST/tax on discounted items</span>
                <span>{formatPrice(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[#E9DCCB] pt-3 font-semibold text-[#171717]">
                <span>Final total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD] p-6">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-5 w-5 text-[#B8893B]" />
            <h2 className="font-display text-3xl text-[#171717]">
              What happens next?
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              "We review and approve your measurements",
              "We confirm your order",
              "We prepare and pack your outfit",
              "We ship and share tracking",
            ].map((step, index) => (
              <div key={step} className="rounded-xl bg-[#FFFDF8] p-4 text-sm text-[#5F5348]">
                <span className="font-display text-2xl text-[#6E0F1A]">
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
