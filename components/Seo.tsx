interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function Seo({
  title: _title,
  description: _description,
  path: _path,
  noIndex: _noIndex,
  jsonLd,
}: SeoProps) {
  if (!jsonLd) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
