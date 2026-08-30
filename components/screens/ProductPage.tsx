import {
  HeartHandshake,
  Mail,
  MessageCircle,
  Ruler,
  Sparkles,
  Truck,
} from "lucide-react";
import Link from "next/link";

import DesignCard from "@/components/DesignCard";
import { PincodeChecker } from "@/components/product/pincode-checker";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfoTabs } from "@/components/product/product-info-tabs";
import { ProductPurchase } from "@/components/product/product-purchase";
import ProductReviews from "@/components/product/product-reviews";
import { formatPrice, siteConfig, whatsappSupportLink } from "@/config/site";
import {
  formatDate,
  getEstimatedDelivery,
  getProductPrice,
  isProductInformationUncertain,
} from "@/lib/commerce";
import type { Product, ProductReview, StoreSettings } from "@/types/commerce";

const sizeRows = [
  ["XS", "32", "26", "34", "Custom"],
  ["S", "34", "28", "36", "Custom"],
  ["M", "36", "30", "38", "Custom"],
  ["L", "38", "32", "40", "Custom"],
  ["XL", "40", "34", "42", "Custom"],
  ["XXL", "42", "36", "44", "Custom"],
];

function ProductFacts({ product }: { product: Product }) {
  const fabricNeedsConfirmation = isProductInformationUncertain(product.fabric);
  const facts = [
    ["Category", product.category.name],
    [
      "Fabric",
      fabricNeedsConfirmation
        ? "Exact fabric confirmation is available from DARAJNI support before ordering."
        : product.fabric,
    ],
    ["Available sizes", product.sizes.join(", ") || "Custom size"],
    ["Availability", product.stock > 0 ? `${product.stock} available` : "Sold out"],
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-3xl leading-none text-text-primary">
        Product Details
      </h2>
      <dl className="mt-5 grid gap-3">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
            <dt className="text-xs font-extrabold uppercase text-accent">
              {label}
            </dt>
            <dd className="text-sm leading-6 text-text-secondary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StickyHelpPanel({
  product,
  supportNumber,
}: {
  product: Product;
  supportNumber: string;
}) {
  const estimate = getEstimatedDelivery(new Date().toISOString());
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    `Hello DARAJNI, I need help with ${product.name}.`,
  );

  return (
    <aside className="space-y-4 xl:sticky xl:top-32">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <Ruler className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl text-text-primary">Size Guide</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[260px] text-left text-[0.68rem] text-text-secondary">
            <thead className="bg-surface-alt">
              <tr>
                {["Size", "Bust", "Waist", "Hip"].map((head) => (
                  <th key={head} className="px-2 py-2 font-extrabold uppercase">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sizeRows.slice(0, 5).map((row) => (
                <tr key={row[0]}>
                  {row.slice(0, 4).map((cell) => (
                    <td key={cell} className="px-2 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/size-guide" className="secondary-button mt-4 w-full">
          How to Measure
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl text-text-primary">Delivery</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-text-secondary">
          <p>
            Standard delivery: {formatDate(estimate.earliest)} to{" "}
            {formatDate(estimate.latest)}
          </p>
          <p>Custom orders may take extra confirmation time.</p>
          <p>Delivery may vary by location and courier availability.</p>
        </div>
        <PincodeChecker />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <HeartHandshake className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl text-text-primary">Exchange</h2>
        </div>
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-text-secondary">
          <li>Exchange available when eligible.</li>
          <li>Product must be unused with tags and package intact.</li>
          <li>Custom-size rules are clearly explained before ordering.</li>
        </ul>
        <Link href="/returns-exchange" className="secondary-button mt-4 w-full">
          Read Policy
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-primary p-5 text-surface">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-success" />
          <h2 className="font-display text-2xl">Need help?</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/70">
          WhatsApp for sizing, fabric questions, delivery help and order support.
        </p>
        <div className="mt-4 grid gap-2">
          <a href={whatsappHref} className="whatsapp-button w-full">
            WhatsApp us
          </a>
          <a href={`mailto:${siteConfig.email}`} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[18px] border border-white/30 bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/60 hover:bg-white/10">
            <Mail className="h-4 w-4" />
            Email support
          </a>
        </div>
      </section>
    </aside>
  );
}

export default function ProductPage({
  product,
  related,
  supportNumber,
  settings,
  reviews,
  isAuthenticated,
}: {
  product: Product;
  related: Product[];
  supportNumber: string;
  settings: StoreSettings;
  reviews: ProductReview[];
  isAuthenticated: boolean;
}) {
  const price = getProductPrice(product);
  const descriptionNeedsConfirmation = isProductInformationUncertain(
    product.description,
  );
  const priceNote = settings.taxRate > 0
    ? `Tax (${settings.taxRate}%) and shipping are shown before payment`
    : settings.shippingCharge > 0
      ? `Applicable taxes included · ${formatPrice(settings.shippingCharge)} shipping at checkout`
      : "Inclusive of applicable taxes · Free shipping";

  return (
    <main className="bg-background py-6 pb-28 sm:py-10">
      <div className="section-shell">
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-secondary"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-accent">
            Home
          </Link>
          <span>/</span>
          <Link href="/collection" className="hover:text-accent">
            Collection
          </Link>
          <span>/</span>
          <span>{product.category.name}</span>
          <span>/</span>
          <span className="text-text-primary">{product.name}</span>
        </nav>

        <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[auto_minmax(23rem,30rem)] xl:justify-center xl:gap-14">
          <ProductGallery images={product.images} name={product.name} />

          <div className="min-w-0">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="status-pill bg-accent text-white">
                  {product.stock > 0
                    ? product.stock === 1
                      ? "Only 1 available"
                      : `${product.stock} available`
                    : "Sold out"}
                </span>
                {product.isFeatured && (
                  <span className="status-pill bg-surface-alt text-error">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Featured
                  </span>
                )}
              </div>
              <p className="eyebrow mt-5">{product.category.name}</p>
              <h1 className="font-display mt-3 text-3xl leading-[1] text-text-primary sm:text-4xl">
                {product.name}
              </h1>
              <div className="mt-4 flex items-end justify-between">
                <p className="font-display text-3xl font-semibold text-text-primary">
                  {formatPrice(price)}
                </p>
                <p className="pb-1 text-xs font-semibold uppercase text-text-secondary">
                  MRP Incl. of all taxes
                </p>
              </div>
              {product.discount > 0 && (
                <div className="mt-4">
                  <span className="mb-1 rounded-full bg-surface-alt px-3 py-1 text-[0.62rem] font-extrabold uppercase text-error">
                    {product.discount}% off
                  </span>
                </div>
              )}
              <div className="mt-6">
                <ProductPurchase
                  product={product}
                  supportNumber={supportNumber}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        </div>

        <section data-reveal className="mt-12 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.42fr)] xl:gap-8">
          <div className="space-y-6">
            <ProductFacts product={product} />
            <ProductInfoTabs product={product} />
          </div>
          <StickyHelpPanel product={product} supportNumber={supportNumber} />
        </section>

        <ProductReviews
          productId={product.id}
          reviews={reviews}
          isAuthenticated={isAuthenticated}
        />

        {related.length > 0 && (
          <section data-reveal className="py-20">
            <p className="eyebrow">Complete your look</p>
            <h2 className="font-display mt-3 text-5xl leading-none text-text-primary">
              Similar designs
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <DesignCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
