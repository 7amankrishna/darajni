import { ArrowRight, ArrowUpRight, Scissors } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "@/components/product/product-image";
import { curatedProducts } from "@/lib/storefront";
import type { Product } from "@/types/commerce";

export function CustomCoutureBanner({ products }: { products: Product[] }) {
  const product = curatedProducts(products).find((item) => item.images.length);
  return (
    <section className="atelier-couture" aria-labelledby="couture-title">
      <div className="atelier-couture-media">
        {product && <ProductImage src={product.images[1] || product.images[0]} alt={`A closer look at ${product.name}`} sizes="(max-width: 768px) 100vw, 50vw" />}
        <span className="atelier-image-note">A closer look / The DARAJNI collection</span>
      </div>
      <div className="atelier-couture-copy" data-reveal>
        <Scissors size={30} strokeWidth={1} aria-hidden="true" />
        <p className="atelier-kicker">02 / Custom couture</p>
        <h2 id="couture-title">Your Vision.<br /><em>Our Craft.</em></h2>
        <p>Some outfits begin with a feeling. A colour you love. A silhouette you can&apos;t forget. Bring us your inspiration, and let&apos;s explore a look that feels entirely yours.</p>
        <ol className="atelier-process">
          <li><span>01</span> Share your reference</li>
          <li><span>02</span> Discuss the design &amp; measurements</li>
          <li><span>03</span> Confirm the details with our team</li>
        </ol>
        <Link href="/requested-dresses" className="atelier-button atelier-button-light">Create Your Look <ArrowRight size={16} /></Link>
        <Link href="/size-guide" className="atelier-text-link">A little help with your measurements <ArrowUpRight size={14} /></Link>
      </div>
    </section>
  );
}

export function ShopByOccasion({ products }: { products: Product[] }) {
  const occasions = [
    { name: "Wedding celebrations", note: "For the moments you keep.", category: "lehenga" },
    { name: "Festive gatherings", note: "A little colour. A lot of joy.", category: "dandiya-rentals" },
    { name: "After-dark occasions", note: "Make an entrance.", category: "gown" },
    { name: "Everyday elegance", note: "Find beauty in the everyday.", category: "co-ord-sets" },
  ];
  return (
    <section className="atelier-section section-shell">
      <div className="atelier-section-heading" data-reveal>
        <div><p className="eyebrow">03 / The occasion edit</p><h2>Life, beautifully <em>dressed.</em></h2></div>
        <p>For the grand celebrations.<br />And the little moments in between.</p>
      </div>
      <div className="atelier-occasion-grid">
        {occasions.map((occasion, index) => {
          const product = products.find((item) => item.category.slug === occasion.category && item.images.length);
          return (
            <Link key={occasion.name} href={product ? `/collection?category=${encodeURIComponent(product.category.slug)}` : "/collection"} className="atelier-occasion">
              <div className="atelier-occasion-image">
                {product && <ProductImage src={product.images[0]} alt={product.name} sizes="(max-width: 640px) 70vw, 25vw" />}
                <span className="atelier-kicker">Edit / 0{index + 1}</span>
              </div>
              <h3>{occasion.name} <ArrowUpRight size={18} /></h3>
              <p>{occasion.note}</p>
              {product && <span className="atelier-occasion-category">Explore {product.category.name}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function AtelierStory({ products }: { products: Product[] }) {
  const product = curatedProducts(products).find((item) => item.category.slug === "anarkali" && item.images.length)
    ?? products.find((item) => item.images.length);
  return (
    <section className="atelier-story">
      <div className="section-shell atelier-story-grid">
        <div className="atelier-story-copy" data-reveal>
          <p className="eyebrow">04 / From Bihar Sharif, with care</p>
          <h2>A small atelier.<br /><em>A personal story.</em></h2>
          <p>Rooted in Bihar Sharif, DARAJNI brings a personal approach to Indian occasion wear. Beautiful silhouettes, thoughtful details, and a conversation about the fit.</p>
          <p>From your first inspiration to your next celebration, we&apos;re here to help you find something that feels like you.</p>
          <Link href="/about" className="atelier-text-link">Step inside our story <ArrowRight size={16} /></Link>
          <span className="atelier-story-signature">DARAJNI <small>Designer House · Bihar Sharif</small></span>
        </div>
        <div className="atelier-story-image">
          {product && <ProductImage src={product.images[2] || product.images[0]} alt={`${product.name}, from our collection`} sizes="(max-width: 768px) 100vw, 45vw" />}
          <span className="atelier-image-note">The details make the difference.</span>
        </div>
      </div>
    </section>
  );
}
