import { Clock, type LucideIcon, MapPin, PackageCheck, Truck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "DARAJNI shipping policy for Pan-India delivery, custom order timing, tracking and delivery limitations.",
};

const summaries: Array<[string, string, LucideIcon]> = [
  ["Pan-India delivery", "Delivery support across India.", Truck],
  ["Standard estimate", "Shared at checkout and confirmation.", Clock],
  ["Custom order estimate", "May vary with measurement confirmation.", PackageCheck],
  ["Tracking available", "Order updates through tracking page.", MapPin],
];

const details = [
  [
    "Order processing time",
    "Orders are checked for product availability, customer details, payment status and custom-size requirements before fulfilment begins.",
  ],
  [
    "Shipping time",
    "Standard delivery depends on your location, courier availability and serviceability for the pincode shared at checkout.",
  ],
  [
    "Custom outfit delay possibility",
    "Custom-size orders may need extra time if measurements, blouse length, sleeve length or finishing details require confirmation.",
  ],
  [
    "Tracking updates",
    "Use your order ID and phone number on the tracking page. Courier tracking may be shared once the outfit is shipped.",
  ],
  [
    "Wrong address issue",
    "If an incorrect or incomplete address is provided, delivery can be delayed. Contact support quickly if address changes are needed.",
  ],
  [
    "Delivery partner limitations",
    "Weather, local restrictions, remote locations and courier delays can affect delivery estimates.",
  ],
];

export default function Page() {
  return (
    <main className="bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Shipping policy</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Pan-India delivery, clearly explained.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
            Delivery estimates can be affected by location, weather, carriers
            and customization details. DARAJNI keeps you updated through order
            tracking and support.
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
