import Link from "next/link";
import { siteConfig, whatsappLink } from "../config/site";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#060606] py-14">
      <div className="section-shell grid gap-10 md:grid-cols-[1.4fr_0.7fr_0.9fr]">
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
            Thoughtful Indian occasion wear, made to order from Bihar Sharif and delivered
            across India.
          </p>
          <p className="mt-4 text-xs text-white/35">
            {siteConfig.locality}, {siteConfig.region} {siteConfig.postalCode}
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Explore</p>
          <div className="flex flex-col gap-3 text-sm text-white/50">
            <a href="/#collection" className="hover:text-[#dfc084]">Collection</a>
            <a href="/#about" className="hover:text-[#dfc084]">Our story</a>
            <Link href="/dashboard" className="hover:text-[#dfc084]">Customer dashboard</Link>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-4">Order & support</p>
          <div className="flex flex-col gap-3 text-sm text-white/50">
            <a
              href={whatsappLink("Hello DARAJNI! I would like to know more about your collection.")}
              target={siteConfig.whatsappNumber ? "_blank" : undefined}
              rel="noreferrer"
              className="hover:text-[#72df99]"
            >
              WhatsApp enquiry
            </a>
            <a href={`mailto:${siteConfig.email}`} className="hover:text-[#dfc084]">
              {siteConfig.email}
            </a>
            <div className="flex gap-4 pt-2">
              <Link href="/privacy" className="text-xs hover:text-white">Privacy</Link>
              <Link href="/terms" className="text-xs hover:text-white">Terms</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="section-shell mt-10 border-t border-white/8 pt-6 text-xs text-white/30">
        © {new Date().getFullYear()} DARAJNI Designer House. Made in Bihar, delivered Pan India.
      </div>
    </footer>
  );
}
