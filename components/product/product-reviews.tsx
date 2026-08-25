import { Star } from "lucide-react";

import { ReviewForm } from "@/components/product/review-form";
import { formatDate } from "@/lib/commerce";
import type { ProductReview } from "@/types/commerce";

function Stars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${className} ${
            star <= value ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border"
          }`}
        />
      ))}
    </span>
  );
}

export default function ProductReviews({
  productId,
  reviews,
  isAuthenticated,
}: {
  productId: string;
  reviews: ProductReview[];
  isAuthenticated: boolean;
}) {
  const count = reviews.length;
  const average = count
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / count) * 10) / 10
    : 0;

  return (
    <section data-reveal id="reviews" className="mt-6 scroll-mt-28">
      <div className="rounded-[1.25rem] border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Customer reviews</p>
            <h2 className="font-display mt-3 text-4xl leading-none text-text-primary">
              {count > 0 ? "What customers say" : "Be the first to review"}
            </h2>
          </div>
          {count > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-semibold leading-none text-text-primary">
                {average.toFixed(1)}
              </span>
              <span className="grid gap-1">
                <Stars value={Math.round(average)} />
                <span className="text-xs text-text-secondary">
                  {count} verified {count === 1 ? "review" : "reviews"}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <ReviewForm productId={productId} isAuthenticated={isAuthenticated} />
        </div>

        {count > 0 && (
          <ul className="mt-8 grid gap-5">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-2xl border border-border/70 bg-surface-alt/50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="icon-medallion !h-10 !w-10 font-display text-lg font-semibold">
                      {review.userName.trim().charAt(0).toUpperCase() || "D"}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-text-primary">
                        {review.userName}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-secondary">
                        {formatDate(review.createdAt)}
                      </span>
                    </span>
                  </div>
                  <Stars value={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-4 text-sm leading-7 text-text-secondary">{review.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
