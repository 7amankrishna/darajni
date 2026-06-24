import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RatingStars from "../components/RatingStars";
import ReviewSection from "../components/ReviewSection";
import Seo from "../components/Seo";
import { formatPrice, siteConfig, whatsappLink } from "../config/site";
import { useCatalog } from "../context/CatalogContext";
import { useReviews } from "../context/ReviewContext";

export default function ProductPage() {
  const { slug } = useParams();
  const { designs, loading } = useCatalog();
  const { approvedReviews } = useReviews();
  const [activeImage, setActiveImage] = useState(0);
  const design = designs.find((item) => item.slug === slug);
  const reviews = approvedReviews.filter((review) => review.productId === design?.id);
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const structuredData = useMemo(() => {
    if (!design) return undefined;
    const product: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: design.name,
      description: design.description,
      image: design.images,
      sku: design.slug,
      category: design.category,
      brand: { "@type": "Brand", name: siteConfig.shortName },
      offers: {
        "@type": "Offer",
        url: `${siteConfig.siteUrl}/design/${design.slug}`,
        priceCurrency: "INR",
        price: design.price,
        availability: design.available
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      },
    };
    if (reviews.length) {
      product.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: average.toFixed(1),
        reviewCount: reviews.length,
      };
    }
    return product;
  }, [average, design, reviews.length]);

  if (loading) {
    return <main className="grid min-h-[65vh] place-items-center"><p className="eyebrow">Loading design…</p></main>;
  }

  if (!design) {
    return (
      <main className="grid min-h-[65vh] place-items-center px-4 text-center">
        <Seo title="Design not found" noIndex />
        <div>
          <p className="eyebrow">Design unavailable</p>
          <h1 className="font-display mt-4 text-5xl">This piece is no longer in the collection.</h1>
          <Link to="/#collection" className="primary-button mt-7">Browse collection</Link>
        </div>
      </main>
    );
  }

  const orderLink = whatsappLink(
    `Hello Darjana! I am interested in ${design.name} (${formatPrice(design.price)} onwards). Please share availability, customisation and delivery details.`,
  );

  return (
    <main className="py-6 sm:py-10">
      <Seo
        title={`${design.name} – ${design.category}`}
        description={`${design.name} by Darjana Designer House in Bihar Sharif. ${design.fabric}. Custom sizing and Pan-India delivery available.`}
        path={`/design/${design.slug}`}
        jsonLd={structuredData}
      />
      <div className="section-shell">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/35" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-[#dfc184]">Home</Link>
          <span>/</span>
          <Link to="/#collection" className="hover:text-[#dfc184]">Collection</Link>
          <span>/</span>
          <span className="text-white/55">{design.name}</span>
        </nav>

        <div className="glass-panel overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="bg-black">
              <div className="aspect-[4/5] md:min-h-[680px] md:aspect-auto">
                <img
                  src={design.images[activeImage]}
                  alt={`${design.name}, image ${activeImage + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              {design.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {design.images.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setActiveImage(index)}
                      className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                        activeImage === index ? "border-[#caaa70]" : "border-transparent"
                      }`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
              <p className="eyebrow">{design.category}</p>
              <h1 className="font-display mt-4 text-4xl leading-none sm:text-6xl">{design.name}</h1>
              <p className="font-display mt-5 text-3xl text-[#dfc084]">
                {formatPrice(design.price)}
                <span className="ml-2 font-sans text-xs text-white/35">onwards</span>
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/38">{design.fabric}</p>
              {reviews.length > 0 && (
                <div className="mt-5 flex items-center gap-2">
                  <RatingStars value={average} />
                  <span className="text-xs text-white/40">{average.toFixed(1)} from {reviews.length} published review{reviews.length === 1 ? "" : "s"}</span>
                </div>
              )}
              <div className="my-7 h-px bg-white/9" />
              <p className="text-sm leading-7 text-white/58">{design.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {design.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] text-white/45">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href={orderLink}
                target={siteConfig.whatsappNumber ? "_blank" : undefined}
                rel="noreferrer"
                className="primary-button mt-9"
              >
                {siteConfig.whatsappNumber ? "Enquire on WhatsApp" : "Go to contact details"}
              </a>
              <p className="mt-4 text-center text-[0.68rem] leading-5 text-white/30">
                Final price and timeline are confirmed after sizing and customisation details.
              </p>
            </div>
          </div>
          <ReviewSection design={design} />
        </div>
      </div>
    </main>
  );
}
