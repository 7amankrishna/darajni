import { Link } from "react-router-dom";
import { formatPrice, siteConfig, whatsappLink } from "../config/site";
import { useReviews } from "../context/ReviewContext";
import { Design } from "../types";
import RatingStars from "./RatingStars";

export default function DesignCard({
  design,
}: {
  design: Design;
}) {
  const { approvedReviews } = useReviews();
  const reviews = approvedReviews.filter((review) => review.productId === design.id);
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const orderLink = whatsappLink(
    `Hello Darjana! I am interested in ${design.name} (${formatPrice(design.price)} onwards). Please share availability and sizing details.`,
  );

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/8 bg-[#11110f] transition hover:-translate-y-1 hover:border-[#caaa70]/35">
      <Link
        to={`/design/${design.slug}`}
        className="relative block aspect-[4/5] w-full overflow-hidden text-left"
        aria-label={`View ${design.name}`}
      >
        <img
          src={design.images[0]}
          alt={`${design.name} by Darjana Designer House`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          {design.featured && (
            <span className="rounded-full bg-[#caaa70] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-black">
              Featured
            </span>
          )}
          {!design.available && (
            <span className="rounded-full bg-black/75 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-white">
              Enquire
            </span>
          )}
        </div>
        <span className="absolute bottom-4 right-4 rounded-full border border-white/25 bg-black/35 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-white backdrop-blur">
          View details
        </span>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow !text-[0.58rem]">{design.category}</p>
            <h3 className="font-display mt-2 text-2xl leading-tight">{design.name}</h3>
          </div>
          <p className="shrink-0 font-display text-xl text-[#dec184]">
            {formatPrice(design.price)}
          </p>
        </div>
        <p className="mt-2 text-xs text-white/38">{design.fabric}</p>
        <div className="mt-4 flex min-h-5 items-center gap-2">
          {reviews.length ? (
            <>
              <RatingStars value={average} />
              <span className="text-[0.68rem] text-white/40">
                {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span className="text-[0.68rem] text-white/30">No published reviews yet</span>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link to={`/design/${design.slug}`} className="secondary-button !px-3">
            Details
          </Link>
          <a
            href={orderLink}
            target={siteConfig.whatsappNumber ? "_blank" : undefined}
            rel="noreferrer"
            className="primary-button !px-3"
          >
            Enquire
          </a>
        </div>
      </div>
    </article>
  );
}
