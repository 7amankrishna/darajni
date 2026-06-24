import { Helmet } from "react-helmet-async";
import { siteConfig } from "../config/site";

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function Seo({
  title,
  description = siteConfig.description,
  path = "/",
  noIndex = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${siteConfig.shortName}` : siteConfig.name;
  const canonical = `${siteConfig.siteUrl}${path === "/" ? "" : path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
