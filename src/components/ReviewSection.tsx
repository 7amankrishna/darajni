import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useReviews } from "../context/ReviewContext";
import { Design } from "../types";
import RatingStars from "./RatingStars";

export default function ReviewSection({ design }: { design: Design }) {
  const { user } = useAuth();
  const { approvedReviews, myReviews, submitReview } = useReviews();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const publicReviews = approvedReviews.filter((review) => review.productId === design.id);
  const ownReview = myReviews.find((review) => review.productId === design.id);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const error = await submitReview({ productId: design.id, rating, comment });
    setSubmitting(false);
    if (error) {
      setMessage(error);
    } else {
      setComment("");
      setRating(5);
      setMessage("Review submitted. It is now pending moderation.");
    }
  };

  return (
    <section className="border-t border-white/8 p-5 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Customer feedback</p>
          <h3 className="font-display mt-3 text-3xl">Reviews with clear moderation</h3>
          <p className="mt-3 text-xs leading-6 text-white/43">
            New reviews remain private while pending. Approved reviews appear publicly;
            rejected reviews stay visible to their author with the moderator’s note.
          </p>

          {!user ? (
            <Link to="/login" state={{ from: "/" }} className="primary-button mt-6">
              Sign in to review
            </Link>
          ) : ownReview ? (
            <div className="mt-6 rounded-xl border border-white/10 p-4">
              <p className="text-sm text-white/65">You have already reviewed this design.</p>
              <p className="mt-2 text-xs text-white/38">
                Status: <strong className="text-[#e0c184]">{ownReview.status}</strong>. You can
                manage it from your dashboard.
              </p>
              <Link to="/dashboard" className="secondary-button mt-4">
                Open dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <span className="field-label">Your rating</span>
                <RatingStars value={rating} onChange={setRating} size="md" />
              </div>
              <div>
                <label htmlFor={`review-${design.id}`} className="field-label">Your comment</label>
                <textarea
                  id={`review-${design.id}`}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="field min-h-28 resize-y"
                  placeholder="Share useful detail about the design or your experience…"
                  required
                  minLength={10}
                  maxLength={1000}
                />
              </div>
              <button type="submit" disabled={submitting} className="primary-button">
                {submitting ? "Submitting…" : "Submit for moderation"}
              </button>
              {message && <p className="text-xs leading-5 text-[#ddc38f]">{message}</p>}
            </form>
          )}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">
            Published reviews ({publicReviews.length})
          </p>
          <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
            {publicReviews.length ? (
              publicReviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{review.authorName}</p>
                    <RatingStars value={review.rating} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">{review.comment}</p>
                  <time className="mt-3 block text-[0.65rem] text-white/28">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                      new Date(review.createdAt),
                    )}
                  </time>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                <p className="font-display text-2xl text-white/40">Be the first to share feedback</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
