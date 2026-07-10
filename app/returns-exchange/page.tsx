import { AlertCircle, CheckCircle2, HeartHandshake, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

import { whatsappSupportLink } from "@/config/site";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Return & Exchange",
  description:
    "DARAJNI return and exchange policy for unused products, packaging, damage reports and custom-size orders.",
};

export default async function Page() {
  const settings = await getStoreSettings();
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I want to start an exchange request.",
  );

  return (
    <main className="bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <HeartHandshake className="mx-auto h-10 w-10 text-[#B8893B]" />
          <p className="eyebrow mt-5">Return & exchange</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Easy exchange, clearly explained.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
            Contact DARAJNI within seven calendar days of delivery. Eligibility
            depends on the product condition, the issue reported and whether
            the outfit was made to your measurements.
          </p>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-7">
            <CheckCircle2 className="h-6 w-6 text-[#1FAF54]" />
            <h2 className="font-display mt-5 text-4xl leading-none text-[#171717]">
              Exchange eligibility
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-[#5F5348]">
              <li>Raise the request within seven calendar days of delivery.</li>
              <li>The product must be unused, unwashed and unaltered.</li>
              <li>Original tags and packaging must remain intact.</li>
              <li>Share clear photos; an opening video is helpful for damage or a wrong item.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[#E9DCCB] bg-[#171717] p-7 text-white">
            <AlertCircle className="h-6 w-6 text-[#D9B56B]" />
            <h2 className="font-display mt-5 text-4xl leading-none">
              Custom-size rule
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/72">
              Custom-size outfits are made using your shared measurements.
              They are not automatically eligible for a change-of-mind return
              or standard-size exchange. Fit corrections, alteration support,
              damage, a manufacturing issue or a wrong item are reviewed using
              the confirmed measurements, order ID and photos/video.
            </p>
          </article>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-7">
            <p className="eyebrow">Shipping & resolution</p>
            <h2 className="font-display mt-4 text-3xl leading-none text-[#171717]">
              Confirm the resolution before sending anything.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#5F5348]">
              Support will confirm whether the approved resolution is an
              alteration, exchange, replacement or refund, along with the
              return address and who pays reverse shipping. Do not send a
              product without that confirmation.
            </p>
          </article>
          <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-7">
            <p className="eyebrow">Refund timing</p>
            <h2 className="font-display mt-4 text-3xl leading-none text-[#171717]">
              Timing is confirmed after inspection.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#5F5348]">
              If a refund is approved, DARAJNI support will confirm the method
              and processing estimate after the returned product is received
              and inspected. Bank or payment-provider posting time can be
              additional.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-7">
          <p className="eyebrow">Process</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-5">
            {[
              "Contact support",
              "Share order ID",
              "Share issue/photos",
              "Team reviews request",
              "Pickup, exchange or alteration decision",
            ].map((step, index) => (
              <div key={step} className="rounded-xl bg-[#F6E9DD] p-4 text-sm leading-6 text-[#5F5348]">
                <span className="font-display text-2xl text-[#6E0F1A]">
                  {index + 1}
                </span>
                <p className="mt-2">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 text-center">
          <a href={whatsappHref} className="whatsapp-button">
            <MessageCircle className="h-4 w-4" />
            Start Exchange Request
          </a>
        </div>
      </div>
    </main>
  );
}
