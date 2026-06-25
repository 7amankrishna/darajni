import Link from "next/link";

import BrandLogo from "@/components/BrandLogo";
import { siteConfig } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#060606] py-14">
      <div className="section-shell grid gap-10 md:grid-cols-[1.35fr_0.7fr_0.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 border border-[#caaa70]/25" />
            <div>
              <p className="font-display text-3xl tracking-[0.12em]">DARAJNI</p>
              <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#caaa70]">
                {siteConfig.slogan}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/45">
            Premium Indian occasion wear from Bihar Sharif, available for
            secure online ordering and Pan-India delivery.
          </p>
          <p className="mt-4 text-xs text-white/35">
            {siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Shop</p>
          <div className="flex flex-col gap-3 text-sm text-white/50">
            <Link href="/#collection" className="hover:text-[#dfc084]">
              Collection
            </Link>
            <Link href="/cart" className="hover:text-[#dfc084]">
              Cart
            </Link>
            <Link href="/track" className="hover:text-[#dfc084]">
              Track order
            </Link>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-4">Help</p>
          <div className="flex flex-col gap-3 text-sm text-white/50">
            <Link href="/support" className="hover:text-[#dfc084]">
              Support contacts
            </Link>
            <a href={`mailto:${siteConfig.email}`} className="hover:text-[#dfc084]">
              {siteConfig.email}
            </a>
            <div className="flex gap-4 pt-2">
              <Link href="/privacy" className="text-xs hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="section-shell mt-10 border-t border-white/8 pt-6 text-xs text-white/30">
        © {new Date().getFullYear()} DARAJNI Designer House. Made in Bihar,
        delivered Pan India.
      </div>
    </footer>
  );
}
