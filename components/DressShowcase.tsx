import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "@/components/product/product-image";
import type { Category, Product } from "@/types/commerce";

export default function DressShowcase({ products, categories }: { products: Product[]; categories: Category[] }) {
  const order = ["anarkali", "lehenga", "gown", "co-ord-sets", "dandiya-rentals"];
  const showcases = [...categories].sort((a, b) => {
    const rank = (slug: string) => order.includes(slug) ? order.indexOf(slug) : order.length;
    return rank(a.slug) - rank(b.slug);
  }).flatMap((category) => {
    const designs = products.filter((product) => product.category.id === category.id);
    const image = designs.find((product) => product.images.length)?.images[0];
    return image ? [{ category, image, count: designs.length }] : [];
  });
  if (!showcases.length) return null;
  return (
    <section id="categories" className="atelier-section section-shell">
      <div className="atelier-section-heading" data-reveal>
        <div><p className="eyebrow">01 / A wardrobe of possibilities</p><h2>Find your <em>silhouette.</em></h2></div>
        <Link href="/collection" className="atelier-text-link">Shop all designs <ArrowUpRight size={16} /></Link>
      </div>
      <div className="atelier-category-grid">
        {showcases.map(({ category, image, count }, index) => (
          <Link key={category.id} href={`/collection?category=${encodeURIComponent(category.slug)}`} className="atelier-category">
            <ProductImage src={image} alt={`${category.name} from the DARAJNI collection`} sizes={index === 0 ? "(max-width: 640px) 100vw, 40vw" : "(max-width: 640px) 50vw, 28vw"} />
            <div className="atelier-category-caption"><span><small>{String(index + 1).padStart(2, "0")} / {count} design{count === 1 ? "" : "s"}</small><h3>{category.name}</h3></span><ArrowUpRight size={24} /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
