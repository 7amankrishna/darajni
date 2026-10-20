"use client";

import { ArrowRight, Pause, Play, Ruler, ShieldCheck, Truck, Headphones } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Great_Vibes, Playfair_Display, Cinzel, Montserrat } from "next/font/google";

import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import { curatedProducts } from "@/lib/storefront";
import type { Product, StoreSettings } from "@/types/commerce";

const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ weight: "400", subsets: ["latin"], display: "swap" });
const cinzel = Cinzel({ weight: "400", subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ weight: "400", subsets: ["latin"], display: "swap" });
const campaignFonts: Record<string, string> = {
  Great_Vibes: greatVibes.className,
  Playfair_Display: playfair.className,
  Cinzel: cinzel.className,
  Montserrat: montserrat.className,
};

export default function Hero({ products, settings }: { products: Product[]; settings: StoreSettings }) {
  const looks = curatedProducts(products).filter((product) => product.images.length).slice(0, 4);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const look = looks[active] ?? looks[0];

  useEffect(() => {
    if (!playing || looks.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % looks.length), 7000);
    return () => window.clearInterval(timer);
  }, [playing, looks.length]);

  return (
    <>
      <section className="atelier-hero" aria-label="DARAJNI editorial collection">
        {look && (
          <div className="atelier-hero-image" key={look.id}>
            <ProductImage src={look.images[0]} alt={look.name} sizes="100vw" priority className="object-cover object-[center_30%]" />
          </div>
        )}
        <div className="atelier-hero-shade" />
        <div className="section-shell atelier-hero-content">
          <p className="atelier-kicker">DARAJNI &nbsp; / &nbsp; The Modern Indian Atelier</p>
          <h1>Rooted in<br /><em>Elegance.</em></h1>
          <p className="atelier-hero-subtitle">Tradition, beautifully reimagined.</p>
          <div className="atelier-hero-actions">
            <Link href="/collection" className="atelier-button atelier-button-light">Explore the Collection <ArrowRight size={16} /></Link>
            <Link href="/requested-dresses" className="atelier-text-link">Discover Custom Couture <ArrowRight size={16} /></Link>
          </div>
          {looks.length > 1 && (
            <div className="atelier-slide-controls" aria-label="Editorial looks">
              <span>{String(active + 1).padStart(2, "0")}</span>
              {looks.map((product, index) => (
                <button key={product.id} type="button" aria-label={`Show ${product.name}`} aria-current={active === index ? "true" : undefined}
                  onClick={() => { setActive(index); setPlaying(false); }} className={active === index ? "is-active" : ""}><span /></button>
              ))}
              <span>{String(looks.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause slideshow" : "Play slideshow"}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          )}
        </div>
        {look && (
          <Link className="atelier-hero-caption" href={`/design/${look.slug}`}>
            <span className="atelier-kicker">In the frame</span>
            <span>{look.name}</span>
            <small>{formatPrice(getProductPrice(look))} <ArrowRight size={14} /></small>
          </Link>
        )}
      </section>
      <div className="atelier-assurances">
        <div className="section-shell">
          <span><Truck size={17} /> Pan-India delivery</span>
          <span><Ruler size={17} /> Measurement assistance</span>
          <span><ShieldCheck size={17} /> Secure checkout</span>
          <span><Headphones size={17} /> Personal support</span>
        </div>
      </div>
      <div className="atelier-campaign section-shell">
        <span className="atelier-kicker" style={{ color: settings.heroAccentColor }}>{settings.heroEyebrow}</span>
        <p className="font-display">{settings.heroTitle} <span className={campaignFonts[settings.heroFontFamily]}>{settings.heroCursiveTitle}</span></p>
        <p>{settings.heroSubtitle}</p>
        <Link href="/collection" className="atelier-text-link">Discover the edit <ArrowRight size={14} /></Link>
      </div>
    </>
  );
}
