import { Clock, type LucideIcon, MapPin, PackageCheck, Truck } from "lucide-react";
import type { Metadata } from "next";

import { formatPrice } from "@/config/site";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "DARAJNI shipping policy for Pan-India delivery, custom order timing, tracking and delivery limitations.",
};

export default async function Page() {
  const settings = await getStoreSettings();
  const shippingText = settings.shippingCharge > 0
    ? `${formatPrice(settings.shippingCharge)} per order`
    : "Free at present";
  const summaries: Array<[string, string, LucideIcon]> = [
    ["Pan-India delivery", "Subject to serviceability at your pincode.", Truck],
    ["Delivery estimate", "Usually 7–12 calendar days from ordering.", Clock],
    ["Current shipping", shippingText, PackageCheck],
    ["Tracking available", "Track with your order ID and phone number.", MapPin],
  ];
  const details = [
    [
      "Order confirmation and processing",
      "We first verify availability, contact details, payment status and any custom-size requirements. The delivery estimate shown by DARAJNI is normally 7–12 calendar days from order placement. If information is missing, fulfilment begins after the required details are confirmed.",
    ],
    [
      "Shipping charge",
      settings.shippingCharge > 0
        ? `The current standard shipping charge is ${formatPrice(settings.shippingCharge)} per order. It is shown separately in the cart and checkout before you pay.`
        : "Standard shipping is currently free. The cart and checkout will show the shipping amount before you pay if this changes.",
    ],
    [
      "Custom-size timelines",
      "Custom-size orders may take longer when measurements, blouse length, sleeve length or finishing details are awaiting confirmation. Support will contact you if the estimate needs to change before dispatch.",
    ],
    [
      "Courier and tracking updates",
      "A delivery partner is selected according to pincode serviceability. Use your order ID and matching phone number on the tracking page; courier details may also be shared after dispatch.",
    ],
    [
      "Address changes and failed delivery",
      "Contact support as soon as possible if an address is incomplete or incorrect. Changes may not be possible after dispatch. Courier reattempts and return-to-origin handling depend on the carrier; support will confirm any resend steps or charges before another dispatch.",
    ],
    [
      "Possible delivery delays",
      "Weather, local restrictions, remote locations, peak-season volume and courier disruptions can affect an estimate. These are delivery estimates rather than guaranteed arrival dates.",
    ],
  ];
  return (
    <main className="bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Shipping policy</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Pan-India delivery, clearly explained.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
            Most orders are estimated to arrive within 7–12 calendar days.
            Your shipping charge is displayed before payment, and custom-size
            confirmation or carrier disruptions can extend the estimate.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaries.map(([title, text, Icon]) => (
            <article key={title} className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
              <Icon className="h-5 w-5 text-[#B8893B]" />
              <h2 className="font-display mt-5 text-2xl leading-none text-[#171717]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6F6255]">{text}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 grid gap-4">
          {details.map(([title, text]) => (
            <details
              key={title}
              className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5"
            >
              <summary className="cursor-pointer font-display text-2xl text-[#171717]">
                {title}
              </summary>
              <p className="mt-4 text-sm leading-7 text-[#6F6255]">{text}</p>
            </details>
          ))}
        </section>
      </div>
    </main>
  );
}
