"use client";

import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

function StarButton({
  value,
  active,
  onEnter,
  onLeave,
  onSelect,
}: {
  value: number;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onSelect}
      className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-2"
    >
      <Star
        className={`h-7 w-7 transition-colors ${
          active ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border"
        }`}
      />
    </button>
  );
}

export function ReviewForm({
  productId,
  isAuthenticated,
}: {
  productId: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-dashed border-accent/40 bg-surface-alt/60 p-6 text-center">
        <p className="text-sm leading-6 text-text-secondary">
          Sign in with your DARAJNI account to rate this design and share your
          experience.
        </p>
        <Link href="/login" className="secondary-button mt-4 w-fit px-8">
          Sign in to write a review
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      toast.error("Choose a star rating first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        toast.error(data?.error || "Your review could not be saved.");
        return;
      }

      toast.success("Thank you! Your review has been published.", {
        description: "Refresh the page to see it in the list below.",
      });
      setRating(0);
      setHoveredRating(0);
      setComment("");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoveredRating || rating;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="font-display text-2xl text-text-primary">Write a review</h3>

      <fieldset className="mt-4">
        <legend className="text-xs font-extrabold uppercase tracking-[0.1em] text-text-secondary">
          Your rating
          {displayRating ? (
            <span className="ml-2 normal-case tracking-normal text-[var(--gold-dark)]">
              {RATING_LABELS[displayRating]}
            </span>
          ) : null}
        </legend>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <StarButton
              key={value}
              value={value}
              active={value <= displayRating}
              onEnter={() => setHoveredRating(value)}
              onLeave={() => setHoveredRating(0)}
              onSelect={() => setRating(value)}
            />
          ))}
        </div>
      </fieldset>

      <label
        htmlFor="review-comment"
        className="mt-5 block text-xs font-extrabold uppercase tracking-[0.1em] text-text-secondary"
      >
        Your review <span className="normal-case tracking-normal">(optional)</span>
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 600))}
        rows={4}
        maxLength={600}
        placeholder="Share the fabric feel, fit, colour accuracy or delivery experience…"
        className="field mt-2 resize-y"
      />
      <p className="mt-1 text-right text-[0.65rem] text-text-secondary">
        {comment.length}/600
      </p>

      <button type="submit" disabled={submitting} className="primary-button mt-3 w-full sm:w-auto sm:min-w-56">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Publishing…
          </>
        ) : (
          "Publish review"
        )}
      </button>
      <p className="mt-3 text-xs leading-5 text-text-secondary">
        Submitting again updates your existing review for this design.
      </p>
    </form>
  );
}
