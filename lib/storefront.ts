import type { Product } from "@/types/commerce";

// Keep the editorial selection tied to live products, including renamed designs.
const editorialSlugs = [
  "maroon-velvet-designer-lehenga-set",
  "traditional-indian-lehenga-choli-with-dupatta",
  "red-white-embroidered-salwar-suit-set",
  "pastel-lavender-designer-lehenga-gown-with-dupatta",
  "aqua-bloom-floral-co-ord-set",
];

export function curatedProducts(products: Product[]) {
  const active = products.filter((product) => product.isActive);
  const selected = editorialSlugs.flatMap((slug) =>
    active.filter((product) => product.slug === slug),
  );
  return [...selected, ...active.filter((product) => !selected.includes(product))];
}
