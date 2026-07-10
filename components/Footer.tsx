import {
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";

import BrandLogo from "@/components/BrandLogo";
import { siteConfig, whatsappSupportLink } from "@/config/site";

const columns = [
  {
    title: "Customer Care",
    links: [
      ["Track Order", "/track"],
      ["Size Guide", "/size-guide"],
      ["WhatsApp Support", "/support"],
      ["Payment Help", "/support"],
      ["Contact", "/support"],
    ],
  },
  {
    title: "Policies",
    links: [
      ["Shipping Policy", "/shipping-policy"],
      ["Return & Exchange", "/returns-exchange"],
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
    ],
  },
  {
    title: "About",
    links: [
      ["Our Story", "/about"],
      ["Craft", "/about"],
      ["Bihar Sharif Studio", "/about"],
    ],
  },
];

export default function Footer({
  supportNumber,
  availableCategories,
}: {
  supportNumber: string;
  availableCategories: Array<{ name: string; slug: string }>;
}) {
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I need customer support.",
  );
  const footerColumns = [
    {
      title: "Shop",
      links: [
        ["New Arrivals", "/collection?sort=newest"],
        ...availableCategories.map((category) => [
          category.name,
          `/collection?category=${encodeURIComponent(category.slug)}`,
        ]),
        ["Custom Fit", "/size-guide"],
      ],
    },
    ...columns,
  ];

  return (
    <footer className="border-t border-[#E9DCCB] bg-[#171717] pb-24 pt-14 text-[#FFFDF8] md:pb-10">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 border border-[#B8893B]/35 bg-[#FFFDF8]" />
            <div>
              <p className="font-display text-3xl tracking-[0.08em]">DARAJNI</p>
              <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#D9B56B]">
                Designer House
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/72">
            Premium Indian occasion wear from Bihar Sharif, custom-sized with
            clear communication and delivered Pan India.
          </p>
          <div className="mt-6 grid gap-3 text-xs text-white/70">
            <a href={whatsappHref} className="flex items-center gap-2 hover:text-white">
              <MessageCircle className="h-4 w-4 text-[#1FAF54]" />
              {supportNumber ? `+${supportNumber}` : "WhatsApp support"}
            </a>
            <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4 text-[#D9B56B]" />
              {siteConfig.email}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#D9B56B]" />
              {siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}
            </span>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-[0.68rem] font-extrabold uppercase text-[#D9B56B]">
                {column.title}
              </p>
              <div className="mt-4 grid gap-3 text-sm text-white/58">
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-shell mt-10 grid gap-4 border-t border-white/10 pt-6 text-xs text-white/64 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-[#D9B56B]" />
            Pan-India delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D9B56B]" />
            Secure checkout
          </span>
        </div>
        <div className="space-y-1 md:text-right">
          <p>
            © {new Date().getFullYear()} DARAJNI Designer House. Made in Bihar,
            delivered Pan India.
          </p>
        </div>
      </div>
    </footer>
  );
}
