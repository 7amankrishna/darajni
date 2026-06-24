interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  size?: "sm" | "md";
}

export default function RatingStars({
  value,
  onChange,
  label = "Rating",
  size = "sm",
}: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1" aria-label={`${label}: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) =>
        onChange ? (
          <button
            type="button"
            key={star}
            onClick={() => onChange(star)}
            className={`${size === "md" ? "text-3xl" : "text-base"} ${
              star <= value ? "text-[#d7b573]" : "text-white/20"
            } leading-none`}
            aria-label={`Set rating to ${star}`}
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            className={`${size === "md" ? "text-xl" : "text-sm"} ${
              star <= Math.round(value) ? "text-[#d7b573]" : "text-white/20"
            } leading-none`}
            aria-hidden="true"
          >
            ★
          </span>
        ),
      )}
    </div>
  );
}
