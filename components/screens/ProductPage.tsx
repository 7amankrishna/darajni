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
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfoTabs } from "@/components/product/product-info-tabs";
import { ProductPurchase } from "@/components/product/product-purchase";
import { formatPrice, siteConfig, whatsappSupportLink } from "@/config/site";
import {
  formatDate,
  getEstimatedDelivery,
  getProductPrice,
  isProductInformationUncertain,
} from "@/lib/commerce";
import type { Product, StoreSettings } from "@/types/commerce";

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
    <section className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
      <h2 className="font-display text-3xl leading-none text-[#171717]">
        Product Details
      </h2>
      <dl className="mt-5 grid gap-3">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-[#E9DCCB] pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
            <dt className="text-xs font-extrabold uppercase text-[#B8893B]">
              {label}
            </dt>
            <dd className="text-sm leading-6 text-[#5F5348]">{value}</dd>
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
      <section className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-[#B8893B]" />
          <h2 className="font-display text-2xl text-[#171717]">Size Guide</h2>
        </div>
        <div className="table-scroll mt-4">
          <table className="w-full min-w-[260px] text-left text-[0.68rem] text-[#5F5348]">
            <thead className="bg-[#F6E9DD]">
              <tr>
                {["Size", "Bust", "Waist", "Hip"].map((head) => (
                  <th key={head} className="px-2 py-2 font-extrabold uppercase">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DCCB]">
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

      <section className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#B8893B]" />
          <h2 className="font-display text-2xl text-[#171717]">Delivery</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-[#5F5348]">
          <p>
            Standard delivery: {formatDate(estimate.earliest)} to{" "}
            {formatDate(estimate.latest)}
          </p>
          <p>Custom orders may take extra confirmation time.</p>
          <p>Delivery may vary by location and courier availability.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-[#B8893B]" />
          <h2 className="font-display text-2xl text-[#171717]">Exchange</h2>
        </div>
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#5F5348]">
          <li>Exchange available when eligible.</li>
          <li>Product must be unused with tags and package intact.</li>
          <li>Custom-size rules are clearly explained before ordering.</li>
        </ul>
        <Link href="/returns-exchange" className="secondary-button mt-4 w-full">
          Read Policy
        </Link>
      </section>

      <section className="rounded-2xl border border-[#E9DCCB] bg-[#171717] p-5 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#1FAF54]" />
          <h2 className="font-display text-2xl">Need help?</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/70">
          WhatsApp for sizing, fabric questions, delivery help and order support.
        </p>
        <div className="mt-4 grid gap-2">
          <a href={whatsappHref} className="whatsapp-button w-full">
            WhatsApp us
          </a>
          <a href={`mailto:${siteConfig.email}`} className="secondary-button w-full !border-white/30 !bg-transparent !text-white">
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
}: {
  product: Product;
  related: Product[];
  supportNumber: string;
  settings: StoreSettings;
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
    <main className="bg-[#FFF8EF] py-6 sm:py-10">
      <div className="section-shell">
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6F6255]"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-[#6E0F1A]">
            Home
          </Link>
          <span>/</span>
          <Link href="/collection" className="hover:text-[#6E0F1A]">
            Collection
          </Link>
          <span>/</span>
          <span>{product.category.name}</span>
          <span>/</span>
          <span className="text-[#171717]">{product.name}</span>
        </nav>

        <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.72fr)] xl:gap-12">
          <ProductGallery images={product.images} name={product.name} />

          <div className="min-w-0">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="status-pill bg-[#6E0F1A] text-white">
                  {product.stock > 0
                    ? product.stock === 1
                      ? "Only 1 available"
                      : `${product.stock} available`
                    : "Sold out"}
                </span>
                {product.isFeatured && (
                  <span className="status-pill bg-[#F6E9DD] text-[#6E0F1A]">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Featured
                  </span>
                )}
              </div>
              <p className="eyebrow mt-5">{product.category.name}</p>
              <h1 className="font-display mt-3 text-5xl leading-[0.92] text-[#171717] sm:text-6xl">
                {product.name}
              </h1>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <p className="font-display text-4xl font-semibold text-[#171717]">
                  {formatPrice(price)}
                </p>
                <p className="pb-1 text-xs font-semibold uppercase text-[#6F6255]">
                  {priceNote}
                </p>
                {product.discount > 0 && (
                  <span className="mb-1 rounded-full bg-[#F6E9DD] px-3 py-1 text-[0.62rem] font-extrabold uppercase text-[#6E0F1A]">
                    {product.discount}% off
                  </span>
                )}
              </div>
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

        {related.length > 0 && (
          <section data-reveal className="py-20">
            <p className="eyebrow">Complete your look</p>
            <h2 className="font-display mt-3 text-5xl leading-none text-[#171717]">
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
