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
    <footer className="mt-auto border-t border-border bg-background pb-24 pt-14 text-text-primary transition-colors md:pb-10">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 border border-accent/35 bg-background" />
            <div>
              <h4 className="font-display text-lg font-bold text-text-primary">DARAJNI</h4>
              <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-accent">
                Designer House
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-text-secondary">
            Premium Indian occasion wear from Bihar Sharif, custom-sized with
            clear communication and delivered Pan India.
          </p>
          <div className="mt-6 grid max-w-md gap-2 text-xs text-text-secondary">
            <a href={whatsappHref} className="footer-contact-row group">
              <MessageCircle className="h-4 w-4 text-[#35C66D]" />
              <span><small>Customer support</small>{supportNumber ? `+${supportNumber}` : "WhatsApp support"}</span>
            </a>
            <a href={`mailto:${siteConfig.email}`} className="footer-contact-row group">
              <Mail className="h-4 w-4 text-accent" />
              <span><small>Email</small>{siteConfig.email}</span>
            </a>
            <span className="footer-contact-row">
              <MapPin className="h-4 w-4 text-accent" />
              <span><small>Studio location</small>{siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-[0.68rem] font-extrabold uppercase text-text-secondary transition hover:text-accent">
                {column.title}
              </p>
              <div className="mt-4 grid gap-3 text-sm text-text-secondary">
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="hover:text-text-primary">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-shell mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-text-secondary sm:flex-row">
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-accent" />
            Pan-India delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Secure checkout
          </span>
        </div>
        <div className="space-y-2 md:text-right">
          <p>
            © {new Date().getFullYear()} DARAJNI Designer House. Made in Bihar,
            delivered Pan India.
          </p>
          <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border bg-background px-3 py-2">
            <span className="text-sm text-text-secondary transition hover:text-accent">Website crafted &amp; managed by Aman Krishna</span>
            <span className="hidden text-text-secondary/35 sm:inline">•</span>
            <a
              href="https://www.instagram.com/darajni.in/"
              target="_blank"
              rel="noreferrer"
              aria-label="DARAJNI on Instagram"
              className="inline-flex items-center gap-1.5 font-bold text-accent transition hover:text-text-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              darajni.in
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
