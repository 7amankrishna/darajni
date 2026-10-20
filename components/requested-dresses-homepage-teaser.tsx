import { Sparkles } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import type { RequestedDress } from "@/types/commerce";

export function RequestedDressesHomepageTeaser({
  requests,
}: {
  requests: RequestedDress[];
}) {
  const displayRequests = requests.slice(0, 4);

  return (
    <section id="requested-dresses" className="atelier-lookbook bg-background py-20 transition-colors sm:py-28">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-text-secondary">Community Inspiration Studio</p>
            <h2 className="font-display mt-3 text-4xl font-light text-text-primary sm:text-6xl">
              A little inspiration.<br /><em>A look of your own.</em>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
              Dress references submitted by registered clients seeking custom tailoring. Upload your favorite design inspiration to be reviewed by our Bihar Sharif atelier.
            </p>
          </div>
          <Link href="/requested-dresses" className="primary-button shrink-0">
            Submit Your Dress Request
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>

        {displayRequests.length > 0 ? (
          <div className="atelier-lookbook-grid mt-12">
            {displayRequests.map((request) => (
              <article
                key={request.id}
                className="group relative"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
                  <ProductImage
                    src={request.imageUrl}
                    alt={request.description || "Requested dress reference"}
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3">
                    <span className="atelier-fabric">
                      Community reference
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">
                    {request.description || "Reference design shared for custom bridal tailoring."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-accent/50 bg-surface p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-accent" />
            <h3 className="font-display mt-3 text-3xl text-text-primary">Be the First to Request a Design</h3>
            <p className="mt-2 text-sm text-text-secondary">Upload an inspiration photo to request custom tailoring from DARAJNI.</p>
            <Link href="/requested-dresses" className="primary-button mt-6">
              Upload Inspiration Image
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
