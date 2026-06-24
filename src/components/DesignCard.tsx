import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice, siteConfig, whatsappLink } from "../config/site";
import { useReviews } from "../context/ReviewContext";
import { Design } from "../types";
import RatingStars from "./RatingStars";

export default function DesignCard({ design }: { design: Design }) {
  const { approvedReviews } = useReviews();
  const [imageIndex, setImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const suppressNavigation = useRef(false);
  const reviews = approvedReviews.filter((review) => review.productId === design.id);
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const hasGallery = design.images.length > 1;
  const orderLink = whatsappLink(
    `Hello DARAJNI! I am interested in ${design.name} (${formatPrice(design.price)} onwards). Please share availability and sizing details.`,
  );

  const showImage = (index: number) => {
    const total = design.images.length;
    setImageIndex((index + total) % total);
  };

  const markSwipe = () => {
    suppressNavigation.current = true;
    window.setTimeout(() => {
      suppressNavigation.current = false;
    }, 250);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/8 bg-[#11110f] transition hover:-translate-y-1 hover:border-[#caaa70]/35">
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < 45 || !hasGallery) return;
          markSwipe();
          showImage(imageIndex + (delta < 0 ? 1 : -1));
        }}
      >
        <Link
          to={`/design/${design.slug}`}
          className="absolute inset-0 block text-left"
          aria-label={`View ${design.name}`}
          onClick={(event) => {
            if (suppressNavigation.current) event.preventDefault();
          }}
        >
          <img
            src={design.images[imageIndex]}
            alt={`${design.name} by DARAJNI Designer House, view ${imageIndex + 1}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </Link>

        <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
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

        {hasGallery && (
          <>
            <button
              type="button"
              onClick={() => showImage(imageIndex - 1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/55 text-xl opacity-100 backdrop-blur transition md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Previous image of ${design.name}`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => showImage(imageIndex + 1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/55 text-xl opacity-100 backdrop-blur transition md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Next image of ${design.name}`}
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {design.images.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  onClick={() => showImage(index)}
                  className={`h-2 rounded-full transition ${
                    index === imageIndex ? "w-6 bg-[#e0c184]" : "w-2 bg-white/45"
                  }`}
                  aria-label={`Show image ${index + 1} of ${design.name}`}
                />
              ))}
            </div>
          </>
        )}

        <Link
          to={`/design/${design.slug}`}
          className="absolute bottom-4 right-4 rounded-full border border-white/25 bg-black/45 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-white backdrop-blur"
        >
          Details
        </Link>
      </div>

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
