import {
  Clock3,
  CreditCard,
  HeartHandshake,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Ruler,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig, whatsappSupportLink } from "@/config/site";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get DARAJNI support for orders, sizing, payment, shipping, exchanges and WhatsApp help.",
};

const supportCards: Array<{
  title: string;
  description: string;
  button: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "Order Help",
    description: "Track, cancel, or modify an order before it is processed.",
    button: "Track order",
    href: "/track",
    icon: PackageSearch,
  },
  {
    title: "Size Help",
    description: "Measurement guide and custom-fit support for your outfit.",
    button: "Open size guide",
    href: "/size-guide",
    icon: Ruler,
  },
  {
    title: "Payment Help",
    description: "Failed payment, refund, Razorpay or COD questions.",
    button: "Get payment help",
    href: "#contact",
    icon: CreditCard,
  },
  {
    title: "Shipping Help",
    description: "Delivery time, tracking, courier and address questions.",
    button: "Shipping policy",
    href: "/shipping-policy",
    icon: Truck,
  },
  {
    title: "Return / Exchange Help",
    description: "Eligibility, photos, opening video and exchange process.",
    button: "Read policy",
    href: "/returns-exchange",
    icon: HeartHandshake,
  },
  {
    title: "WhatsApp Support",
    description: "Fastest option for sizing, delivery and order questions.",
    button: "Open WhatsApp",
    href: "#whatsapp",
    icon: MessageCircle,
  },
];

export default async function Page() {
  const settings = await getStoreSettings();
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I need customer support.",
  );

  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-[#B8893B]" />
          <p className="eyebrow mt-5">Customer care</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            How can we help you?
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
            Choose the closest topic and DARAJNI will guide you clearly. Orders
            should still be placed through the website cart and secure checkout.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {supportCards.map((card) => {
            const Icon = card.icon;
            const href = card.title === "WhatsApp Support" ? whatsappHref : card.href;
            const external = card.title === "WhatsApp Support" && Boolean(supportNumber);
            return (
              <article key={card.title} className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-7 shadow-[0_18px_50px_rgba(83,54,22,0.07)]">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F6E9DD] text-[#B8893B]">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="font-display mt-6 text-4xl leading-none text-[#171717]">
                  {card.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#6F6255]">
                  {card.description}
                </p>
                {href.startsWith("#") ? (
                  <a href={href} className="secondary-button mt-7 w-full">
                    {card.button}
                  </a>
                ) : (
                  <Link
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className={card.title === "WhatsApp Support" ? "whatsapp-button mt-7 w-full" : "secondary-button mt-7 w-full"}
                  >
                    {card.button}
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <section
          id="contact"
          className="mt-10 rounded-2xl border border-[#E9DCCB] bg-[#171717] p-7 text-white shadow-[0_18px_50px_rgba(83,54,22,0.1)] sm:p-9"
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase text-[#D9B56B]">
                Contact
              </p>
              <h2 className="font-display mt-3 text-5xl leading-none">
                Human support, clearly routed.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                For fastest help, share your order ID, phone number and a clear
                photo/video if the question is about fit, product condition or
                delivery.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-white/82">
              <a
                id="whatsapp"
                href={whatsappHref}
                target={supportNumber ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:bg-white/5"
              >
                <MessageCircle className="h-5 w-5 shrink-0 text-[#35C66D]" />
                <span><small className="mb-1 block text-[0.62rem] font-extrabold uppercase text-[#D9B56B]">WhatsApp support</small>{supportNumber ? `+${supportNumber}` : "Start a support conversation"}</span>
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:bg-white/5"
              >
                <Mail className="h-5 w-5 shrink-0 text-[#D9B56B]" />
                <span><small className="mb-1 block text-[0.62rem] font-extrabold uppercase text-[#D9B56B]">Email</small>{siteConfig.email}</span>
              </a>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 p-4">
                <MapPin className="h-5 w-5 shrink-0 text-[#D9B56B]" />
                <span><small className="mb-1 block text-[0.62rem] font-extrabold uppercase text-[#D9B56B]">Studio location</small>{siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}</span>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-white/72">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#D9B56B]" />
                <span><strong className="block text-white">Support hours</strong>10 AM–7 PM, Monday–Saturday. Messages outside hours are answered as soon as support is available.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
