import {
  ArrowRight,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig, whatsappSupportLink } from "@/config/site";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Customer Support",
  description:
    "Get DARAJNI help with custom measurements, active orders, delivery, payments and exchanges.",
};

const quickAnswers = [
  ["When are measurements confirmed?", "A tailoring team member reviews submitted measurements before cutting. Your order item remains marked as submitted until that review is complete."],
  ["Is COD always available?", "COD appears only when it is enabled by the store and eligible for the pincode checked at checkout. Online payment remains available through Razorpay."],
  ["Can a custom-size order be exchanged?", "Custom-size exchanges are limited. Read the return and exchange policy before ordering and contact support immediately if the finished outfit differs from confirmed measurements."],
  ["What should I send for order help?", "Send your order number, the phone used at checkout, and clear photos or an opening video when the issue concerns delivery or product condition."],
];

export default async function Page() {
  const settings = await getStoreSettings();
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;
  const generalWhatsapp = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I need customer support.",
  );
  const measurementWhatsapp = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I need help checking my custom measurements.",
  );

  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell">
        <header className="grid gap-8 rounded-3xl border border-[#E9DCCB] bg-[#171717] p-7 text-white shadow-[0_24px_70px_rgba(83,54,22,0.14)] sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-extrabold uppercase text-[#D9B56B]">DARAJNI support desk</p>
            <h1 className="font-display mt-4 text-5xl leading-none sm:text-7xl">
              Start with the right kind of help.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              Choose measurement help, order tracking, or direct customer care.
              Orders and payments are accepted only through the website checkout.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/75">
            <p className="font-semibold text-white">Support hours</p>
            <p>Monday–Saturday, 10 AM–7 PM IST</p>
            <p className="mt-2 text-xs text-white/60">For faster help, include your order number and checkout phone.</p>
          </div>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-6">
            <Ruler className="h-6 w-6 text-[#B8893B]" />
            <h2 className="font-display mt-5 text-3xl text-[#171717]">Measurement help</h2>
            <p className="mt-3 text-sm leading-7 text-[#6F6255]">Learn where to place the tape, then ask the tailoring team to check anything uncertain.</p>
            <div className="mt-6 grid gap-2">
              <Link href="/size-guide" className="secondary-button">Open measurement guide</Link>
              <a href={measurementWhatsapp} className="whatsapp-button"><MessageCircle className="h-4 w-4" /> Ask on WhatsApp</a>
            </div>
          </article>
          <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-6">
            <PackageSearch className="h-6 w-6 text-[#B8893B]" />
            <h2 className="font-display mt-5 text-3xl text-[#171717]">Active order help</h2>
            <p className="mt-3 text-sm leading-7 text-[#6F6255]">Check order progress privately with the order number and matching checkout phone.</p>
            <Link href="/track" className="primary-button mt-6 w-full">Track my order <ArrowRight className="h-4 w-4" /></Link>
          </article>
          <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-6">
            <ShieldCheck className="h-6 w-6 text-[#B8893B]" />
            <h2 className="font-display mt-5 text-3xl text-[#171717]">Payment or exchange</h2>
            <p className="mt-3 text-sm leading-7 text-[#6F6255]">Get help with Razorpay, COD, delivery condition, or exchange eligibility.</p>
            <a href={generalWhatsapp} className="whatsapp-button mt-6 w-full"><MessageCircle className="h-4 w-4" /> Contact customer care</a>
          </article>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">Quick answers</p>
            <div className="mt-5 divide-y divide-[#E9DCCB] overflow-hidden rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8]">
              {quickAnswers.map(([question, answer]) => (
                <details key={question} className="group p-5 open:bg-[#F6E9DD]">
                  <summary className="cursor-pointer list-none font-semibold text-[#171717]">{question}</summary>
                  <p className="mt-3 text-sm leading-7 text-[#5F5348]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <aside className="h-fit rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD] p-6">
            <p className="eyebrow">Other ways to reach us</p>
            <div className="mt-5 grid gap-3 text-sm text-[#5F5348]">
              <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 rounded-xl bg-[#FFFDF8] p-4"><Mail className="h-5 w-5 text-[#B8893B]" />{siteConfig.email}</a>
              <div className="flex items-center gap-3 rounded-xl bg-[#FFFDF8] p-4"><MapPin className="h-5 w-5 text-[#B8893B]" />{siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}</div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/shipping-policy" className="secondary-button !px-3">Shipping</Link>
              <Link href="/returns-exchange" className="secondary-button !px-3">Exchanges</Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
