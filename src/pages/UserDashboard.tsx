import { FormEvent, useState } from "react";
import Seo from "../components/Seo";
import RatingStars from "../components/RatingStars";
import { useAuth } from "../context/AuthContext";
import { useReviews } from "../context/ReviewContext";
import { Review, ReviewStatus } from "../types";

const statusClasses: Record<ReviewStatus, string> = {
  pending: "bg-amber-400/10 text-amber-200",
  approved: "bg-emerald-400/10 text-emerald-200",
  rejected: "bg-rose-400/10 text-rose-200",
};

export default function UserDashboard() {
  const { profile, signOut } = useAuth();
  const { myReviews, updateMyReview, deleteReview, loading } = useReviews();
  const [editing, setEditing] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  const beginEdit = (review: Review) => {
    setEditing(review);
    setRating(review.rating);
    setComment(review.comment);
    setMessage("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const error = await updateMyReview(editing.id, rating, comment);
    if (error) setMessage(error);
    else {
      setEditing(null);
      setMessage("Review updated and returned to pending moderation.");
    }
  };

  const remove = async (review: Review) => {
    if (!window.confirm(`Delete your review for "${review.productName}"?`)) return;
    const error = await deleteReview(review.id);
    setMessage(error || "Review deleted.");
  };

  return (
    <main className="min-h-[70vh] py-12 sm:py-16">
      <Seo title="Customer dashboard" path="/dashboard" noIndex />
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Customer dashboard</p>
            <h1 className="font-display mt-3 text-5xl">Hello, {profile?.fullName || "there"}</h1>
            <p className="mt-3 text-sm text-white/43">
              Your review history and moderation status, all in one place.
            </p>
          </div>
          <button type="button" onClick={() => void signOut()} className="secondary-button">
            Sign out
          </button>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {[
            ["Total reviews", myReviews.length],
            ["Published", myReviews.filter((item) => item.status === "approved").length],
            ["Awaiting review", myReviews.filter((item) => item.status === "pending").length],
          ].map(([label, value]) => (
            <div key={String(label)} className="glass-panel p-5">
              <p className="text-xs uppercase tracking-wider text-white/35">{label}</p>
              <p className="font-display mt-2 text-4xl text-[#dfc184]">{value}</p>
            </div>
          ))}
        </div>

        {message && (
          <p className="mt-6 rounded-xl border border-[#caaa70]/20 bg-[#caaa70]/5 p-4 text-sm text-[#e2c896]">
            {message}
          </p>
        )}

        <section className="mt-8">
          <h2 className="font-display text-3xl">Your reviews</h2>
          {loading ? (
            <p className="mt-5 text-sm text-white/40">Loading reviews…</p>
          ) : myReviews.length ? (
            <div className="mt-5 space-y-4">
              {myReviews.map((review) => (
                <article key={review.id} className="glass-panel p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-display text-2xl">{review.productName}</h3>
                        <span className={`status-pill ${statusClasses[review.status]}`}>
                          {review.status}
                        </span>
                      </div>
                      <div className="mt-3"><RatingStars value={review.rating} /></div>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">{review.comment}</p>
                      {review.moderationNote && (
                        <div className="mt-4 rounded-lg border border-white/9 bg-white/[0.025] p-4 text-xs leading-6 text-white/48">
                          <strong className="text-white/70">Moderator note:</strong>{" "}
                          {review.moderationNote}
                        </div>
                      )}
                      <p className="mt-4 text-[0.68rem] text-white/27">
                        Last updated{" "}
                        {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                          new Date(review.updatedAt),
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {review.status !== "approved" && (
                        <button type="button" onClick={() => beginEdit(review)} className="secondary-button">
                          Edit
                        </button>
                      )}
                      <button type="button" onClick={() => void remove(review)} className="danger-button">
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 py-16 text-center">
              <p className="font-display text-3xl text-white/45">You have not submitted a review yet</p>
              <a href="/#collection" className="primary-button mt-6">Browse collection</a>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/80 p-3">
          <form onSubmit={save} className="glass-panel w-full max-w-lg p-6 sm:p-8">
            <p className="eyebrow">Edit review</p>
            <h2 className="font-display mt-3 text-3xl">{editing.productName}</h2>
            <div className="mt-6">
              <span className="field-label">Rating</span>
              <RatingStars value={rating} onChange={setRating} size="md" />
            </div>
            <div className="mt-5">
              <label htmlFor="edit-comment" className="field-label">Comment</label>
              <textarea
                id="edit-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="field min-h-32"
                required
                minLength={10}
                maxLength={1000}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/35">
              Saving an edit sends the review back to pending moderation.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="submit" className="primary-button flex-1">Save review</button>
              <button type="button" onClick={() => setEditing(null)} className="secondary-button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
