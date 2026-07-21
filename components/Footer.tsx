import {
  AtSign,
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
      ["Request a Dress", "/#requested-dresses"],
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
    <footer className="border-t border-[#E8E2DA] bg-white pb-24 pt-14 text-[#1E1E1E] transition-colors dark:border-[#3B3026] dark:bg-[#100D0B] dark:text-[#F7EADB] md:pb-10">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 border border-[#C8A97E]/35 bg-white dark:border-[#C8A97E]/40 dark:bg-[#1B1612]" />
            <div>
              <p className="font-display text-3xl tracking-[0.08em] text-[#1E1E1E] dark:text-[#F7EADB]">DARAJNI</p>
              <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#C8A97E]">
                Designer House
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
            Premium Indian occasion wear from Bihar Sharif, custom-sized with
            clear communication and delivered Pan India.
          </p>
          <div className="mt-6 grid max-w-md gap-2 text-xs text-[#666666] dark:text-[#B8A898]">
            <a href={whatsappHref} className="footer-contact-row group">
              <MessageCircle className="h-4 w-4 text-[#35C66D]" />
              <span><small>Customer support</small>{supportNumber ? `+${supportNumber}` : "WhatsApp support"}</span>
            </a>
            <a href={`mailto:${siteConfig.email}`} className="footer-contact-row group">
              <Mail className="h-4 w-4 text-[#C8A97E]" />
              <span><small>Email</small>{siteConfig.email}</span>
            </a>
            <span className="footer-contact-row">
              <MapPin className="h-4 w-4 text-[#C8A97E]" />
              <span><small>Studio location</small>{siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-[0.68rem] font-extrabold uppercase text-[#C8A97E]">
                {column.title}
              </p>
              <div className="mt-4 grid gap-3 text-sm text-[#666666] dark:text-[#B8A898]">
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="hover:text-[#1E1E1E] dark:hover:text-[#F7EADB]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-shell mt-10 grid gap-4 border-t border-[#E8E2DA] pt-6 text-xs text-[#666666] dark:border-[#3B3026] dark:text-[#B8A898] md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-[#C8A97E]" />
            Pan-India delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C8A97E]" />
            Secure checkout
          </span>
        </div>
        <div className="space-y-2 md:text-right">
          <p>
            © {new Date().getFullYear()} DARAJNI Designer House. Made in Bihar,
            delivered Pan India.
          </p>
          <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[#E8E2DA] bg-white px-3 py-2 dark:border-[#3B3026] dark:bg-[#1B1612]">
            <span>Website crafted &amp; managed by Aman Krishna</span>
            <span className="hidden text-[#666666]/35 sm:inline dark:text-[#B8A898]/35">•</span>
            <a
              href="https://www.instagram.com/bruhh.aman/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-[#C8A97E] transition hover:text-[#1E1E1E] dark:hover:text-[#F7EADB]"
            >
              <AtSign className="h-3.5 w-3.5" />
              @bruhh.aman
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
