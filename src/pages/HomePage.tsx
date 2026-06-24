import { useMemo } from "react";
import About from "../components/About";
import Collection from "../components/Collection";
import Contact from "../components/Contact";
import Hero from "../components/Hero";
import Seo from "../components/Seo";
import { siteConfig } from "../config/site";
import { useCatalog } from "../context/CatalogContext";

export default function HomePage() {
  const { designs } = useCatalog();

  const structuredData = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "ClothingStore",
        name: siteConfig.name,
        url: siteConfig.siteUrl,
        description: siteConfig.description,
        email: siteConfig.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.locality,
          addressRegion: siteConfig.region,
          postalCode: siteConfig.postalCode,
          addressCountry: "IN",
        },
        areaServed: { "@type": "Country", name: "India" },
        priceRange: "₹₹",
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "DARAJNI designer collection",
        itemListElement: designs.slice(0, 12).map((design, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: design.name,
            description: design.description,
            image: design.images[0],
            category: design.category,
            brand: { "@type": "Brand", name: siteConfig.shortName },
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: design.price,
              availability: design.available
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
            },
          },
        })),
      },
    ],
    [designs],
  );

  return (
    <>
      <Seo jsonLd={structuredData} />
      <Hero />
      <Collection />
      <About />
      <Contact />
    </>
  );
}
