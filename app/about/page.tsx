import {
  BadgeCheck,
  CreditCard,
  HeartHandshake,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Ruler,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "About DARAJNI",
  description:
    "Learn about DARAJNI Designer House, a Bihar Sharif occasion-wear label with custom sizing and Pan-India delivery.",
};

const promises: Array<[string, LucideIcon]> = [
  ["Clear pricing", BadgeCheck],
  ["Custom fit support", Ruler],
  ["Secure checkout", CreditCard],
  ["Pan-India delivery", Truck],
  ["Human support", MessageCircle],
];

export default async function Page() {
  const { products } = await getCatalog();
  const images = products.flatMap((product) => product.images).slice(0, 4);
  const fallback = "/logo.webp";

  return (
    <main className="bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell">
        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Our story</p>
            <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
              Rooted in Bihar Sharif. Made for modern Indian celebrations.
            </h1>
            <p className="mt-6 text-base leading-8 text-[#5F5348]">
              DARAJNI brings occasion wear with custom sizing, clear
              communication and Pan-India delivery. The brand is built for
              customers who want a boutique experience without confusion.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 text-[#5F5348]">
              <MapPin className="h-5 w-5 text-[#B8893B]" />
              Bihar Sharif, Bihar 803111
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`relative overflow-hidden rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD] ${
                  index === 0 || index === 3 ? "aspect-[4/5]" : "aspect-square"
                }`}
              >
                <ProductImage
                  src={images[index] || fallback}
                  alt=""
                  sizes="(max-width: 768px) 45vw, 22vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Why we started</p>
            <h2 className="font-display mt-4 text-5xl leading-none text-[#171717]">
              Honest product details and custom-fit support.
            </h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-[#5F5348]">
            <p>
              DARAJNI began with a local promise: show every design clearly,
              explain prices honestly and help each customer choose the right
              fit before the outfit is prepared.
            </p>
            <p>
              The online store keeps ordering simple with guest checkout,
              secure payment, COD availability, order tracking and WhatsApp
              support for measurements and product questions.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <p className="eyebrow">Our promise</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {promises.map(([title, Icon]) => (
              <article key={title} className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                <Icon className="h-5 w-5 text-[#B8893B]" />
                <h3 className="font-display mt-5 text-2xl leading-none text-[#171717]">
                  {title}
                </h3>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-[#E9DCCB] bg-[#171717] p-7 text-white sm:p-9">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <HeartHandshake className="h-6 w-6 text-[#D9B56B]" />
              <h2 className="font-display mt-4 text-5xl leading-none">
                Explore the current collection.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                Browse available designs and choose a custom-fit outfit for
                your next celebration.
              </p>
            </div>
            <Link href="/collection" className="primary-button !bg-[#FFFDF8] !text-[#171717]">
              Explore Collection
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
