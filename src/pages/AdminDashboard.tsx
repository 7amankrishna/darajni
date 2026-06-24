import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Seo from "../components/Seo";
import RatingStars from "../components/RatingStars";
import { formatPrice } from "../config/site";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../context/CatalogContext";
import { useReviews } from "../context/ReviewContext";
import { categories } from "../data/designs";
import { Design, ReviewStatus } from "../types";

type DesignDraft = Omit<Design, "id" | "createdAt" | "updatedAt">;

const emptyDraft: DesignDraft = {
  name: "",
  slug: "",
  category: "Lehenga",
  price: 0,
  fabric: "",
  description: "",
  tags: [],
  images: [],
  featured: false,
  available: true,
  color: "#caaa70",
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ProductForm({
  editing,
  onClose,
}: {
  editing: Design | null;
  onClose: () => void;
}) {
  const { createDesign, updateDesign, uploadImage } = useCatalog();
  const [draft, setDraft] = useState<DesignDraft>(emptyDraft);
  const [tagText, setTagText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(
      editing
        ? {
            name: editing.name,
            slug: editing.slug,
            category: editing.category,
            price: editing.price,
            fabric: editing.fabric,
            description: editing.description,
            tags: [...editing.tags],
            images: [...editing.images],
            featured: editing.featured,
            available: editing.available,
            color: editing.color,
          }
        : emptyDraft,
    );
    setMessage("");
  }, [editing]);

  const field = <K extends keyof DesignDraft>(key: K, value: DesignDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (url && !draft.images.includes(url)) field("images", [...draft.images, url]);
    setImageUrl("");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const result = await uploadImage(file);
    setUploading(false);
    if (result.error) setMessage(result.error);
    if (result.url) field("images", [...draft.images, result.url]);
    event.target.value = "";
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.images.length) {
      setMessage("Add at least one product image.");
      return;
    }
    setSaving(true);
    setMessage("");
    const normalized = { ...draft, slug: draft.slug || makeSlug(draft.name) };
    const error = editing
      ? await updateDesign(editing.id, normalized)
      : await createDesign(normalized);
    setSaving(false);
    if (error) setMessage(error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/82 p-2 sm:p-5">
      <form
        onSubmit={save}
        className="glass-panel mx-auto my-3 w-full max-w-3xl p-5 sm:my-8 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{editing ? "Edit product" : "New product"}</p>
            <h2 className="font-display mt-2 text-4xl">
              {editing ? editing.name : "Add to the collection"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 text-xl">
            ×
          </button>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="product-name" className="field-label">Product name</label>
            <input
              id="product-name"
              value={draft.name}
              onChange={(event) => {
                field("name", event.target.value);
                if (!editing) field("slug", makeSlug(event.target.value));
              }}
              className="field"
              required
            />
          </div>
          <div>
            <label htmlFor="product-slug" className="field-label">SEO slug</label>
            <input
              id="product-slug"
              value={draft.slug}
              onChange={(event) => field("slug", makeSlug(event.target.value))}
              className="field"
              required
            />
          </div>
          <div>
            <label htmlFor="product-category" className="field-label">Category</label>
            <select
              id="product-category"
              value={draft.category}
              onChange={(event) => field("category", event.target.value)}
              className="field"
            >
              {categories.filter((item) => item !== "All").map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="product-price" className="field-label">Starting price (INR)</label>
            <input
              id="product-price"
              type="number"
              min="1"
              value={draft.price || ""}
              onChange={(event) => field("price", Number(event.target.value))}
              className="field"
              required
            />
          </div>
          <div>
            <label htmlFor="product-fabric" className="field-label">Fabric / material</label>
            <input
              id="product-fabric"
              value={draft.fabric}
              onChange={(event) => field("fabric", event.target.value)}
              className="field"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="product-description" className="field-label">Description</label>
            <textarea
              id="product-description"
              value={draft.description}
              onChange={(event) => field("description", event.target.value)}
              className="field min-h-32"
              required
              minLength={30}
            />
          </div>
          <div className="sm:col-span-2">
            <span className="field-label">Product images</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="field flex-1"
                placeholder="Paste an image URL"
                type="url"
              />
              <button type="button" onClick={addImageUrl} className="secondary-button">Add URL</button>
              <label className="secondary-button cursor-pointer">
                {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {draft.images.map((image) => (
                <div key={image} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10">
                  <img src={image} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => field("images", draft.images.filter((item) => item !== image))}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/75"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="field-label">Tags</span>
            <div className="flex gap-2">
              <input
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const tag = tagText.trim();
                    if (tag && !draft.tags.includes(tag)) field("tags", [...draft.tags, tag]);
                    setTagText("");
                  }
                }}
                className="field"
                placeholder="Type a tag and press Enter"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.tags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => field("tags", draft.tags.filter((item) => item !== tag))}
                  className="rounded-full border border-[#caaa70]/25 px-3 py-1 text-xs text-[#dec38c]"
                >
                  {tag} ×
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/9 p-4">
            <input
              id="featured"
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => field("featured", event.target.checked)}
              className="h-5 w-5 accent-[#caaa70]"
            />
            <label htmlFor="featured" className="text-sm text-white/65">Feature on collection</label>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/9 p-4">
            <input
              id="available"
              type="checkbox"
              checked={draft.available}
              onChange={(event) => field("available", event.target.checked)}
              className="h-5 w-5 accent-[#caaa70]"
            />
            <label htmlFor="available" className="text-sm text-white/65">Available for enquiry</label>
          </div>
        </div>

        {message && <p className="mt-5 text-sm text-rose-300">{message}</p>}
        <div className="mt-7 flex gap-3">
          <button type="submit" disabled={saving || uploading} className="primary-button flex-1">
            {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
          <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminDashboard() {
  const { profile, signOut, isDemoMode } = useAuth();
  const { designs, deleteDesign } = useCatalog();
  const { adminReviews, moderateReview, deleteReview } = useReviews();
  const [tab, setTab] = useState<"products" | "reviews">("reviews");
  const [editing, setEditing] = useState<Design | null | undefined>(undefined);
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const filteredReviews = useMemo(
    () =>
      reviewFilter === "all"
        ? adminReviews
        : adminReviews.filter((review) => review.status === reviewFilter),
    [adminReviews, reviewFilter],
  );

  const moderate = async (id: string, status: "approved" | "rejected") => {
    const note = notes[id] || "";
    if (status === "rejected" && !note.trim()) {
      setMessage("Add a clear moderation note before rejecting a review.");
      return;
    }
    const error = await moderateReview(id, status, note);
    setMessage(error || `Review ${status}.`);
  };

  const removeProduct = async (design: Design) => {
    if (!window.confirm(`Delete "${design.name}" and its reviews?`)) return;
    const error = await deleteDesign(design.id);
    setMessage(error || "Product deleted.");
  };

  return (
    <main className="min-h-[70vh] py-10 sm:py-14">
      <Seo title="Admin dashboard" path="/admin" noIndex />
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Admin dashboard</p>
            <h1 className="font-display mt-3 text-5xl">Welcome, {profile?.fullName}</h1>
            <p className="mt-3 text-sm text-white/43">
              Manage the public collection and keep review decisions clear and accountable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="secondary-button">View storefront</a>
            <button type="button" onClick={() => void signOut()} className="secondary-button">Sign out</button>
          </div>
        </div>

        {isDemoMode && (
          <p className="mt-6 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 text-xs leading-6 text-sky-100/65">
            Demo mode is active. Changes persist in this browser. Add Supabase environment
            variables to use secure shared production data.
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Products", designs.length],
            ["Pending reviews", adminReviews.filter((item) => item.status === "pending").length],
            ["Published reviews", adminReviews.filter((item) => item.status === "approved").length],
          ].map(([label, value]) => (
            <div key={String(label)} className="glass-panel p-5">
              <p className="text-xs uppercase tracking-wider text-white/35">{label}</p>
              <p className="font-display mt-2 text-4xl text-[#dfc184]">{value}</p>
            </div>
          ))}
        </div>

        {message && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#caaa70]/20 bg-[#caaa70]/5 p-4 text-sm text-[#e2c896]">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <div className="mt-8 flex gap-2 border-b border-white/9">
          {(["reviews", "products"] as const).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider ${
                tab === item ? "border-[#caaa70] text-[#e1c48c]" : "border-transparent text-white/35"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "reviews" ? (
          <section className="mt-6">
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "rejected", "all"] as const).map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setReviewFilter(status)}
                  className={`rounded-full border px-4 py-2 text-xs capitalize ${
                    reviewFilter === status
                      ? "border-[#caaa70] bg-[#caaa70]/10 text-[#e3c78f]"
                      : "border-white/10 text-white/40"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {filteredReviews.length ? (
                filteredReviews.map((review) => (
                  <article key={review.id} className="glass-panel p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-display text-2xl">{review.productName}</h3>
                          <span className="status-pill bg-white/7 text-white/55">{review.status}</span>
                        </div>
                        <p className="mt-2 text-xs text-white/36">
                          By {review.authorName} ·{" "}
                          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                            new Date(review.createdAt),
                          )}
                        </p>
                        <div className="mt-3"><RatingStars value={review.rating} /></div>
                        <p className="mt-4 text-sm leading-7 text-white/58">{review.comment}</p>
                        {review.moderationNote && (
                          <p className="mt-4 text-xs leading-6 text-white/38">
                            Existing note: {review.moderationNote}
                          </p>
                        )}
                      </div>
                      <div className="w-full shrink-0 lg:w-80">
                        <label htmlFor={`note-${review.id}`} className="field-label">Moderation note</label>
                        <textarea
                          id={`note-${review.id}`}
                          value={notes[review.id] ?? review.moderationNote ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({ ...current, [review.id]: event.target.value }))
                          }
                          className="field min-h-24"
                          placeholder="Required when rejecting; optional when approving"
                        />
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => void moderate(review.id, "approved")} className="primary-button !px-3">
                            Approve
                          </button>
                          <button type="button" onClick={() => void moderate(review.id, "rejected")} className="danger-button !px-3">
                            Reject
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Permanently delete this review?")) void deleteReview(review.id);
                          }}
                          className="mt-3 w-full text-xs text-white/28 hover:text-rose-300"
                        >
                          Delete permanently
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/12 py-16 text-center">
                  <p className="font-display text-3xl text-white/42">No {reviewFilter} reviews</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <div className="flex justify-end">
              <button type="button" onClick={() => setEditing(null)} className="primary-button">
                Add product
              </button>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/9">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-white/[0.035] text-[0.68rem] uppercase tracking-wider text-white/38">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designs.map((design) => (
                    <tr key={design.id} className="border-t border-white/8 text-sm text-white/55">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={design.images[0]} alt="" className="h-14 w-11 rounded object-cover" />
                          <span className="font-semibold text-white/75">{design.name}</span>
                        </div>
                      </td>
                      <td className="p-4">{design.category}</td>
                      <td className="p-4">{formatPrice(design.price)}</td>
                      <td className="p-4">{design.available ? "Available" : "Enquire only"}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditing(design)} className="secondary-button !min-h-9 !px-4 !py-2">
                            Edit
                          </button>
                          <button type="button" onClick={() => void removeProduct(design)} className="danger-button !min-h-9 !px-4 !py-2">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {editing !== undefined && (
        <ProductForm editing={editing} onClose={() => setEditing(undefined)} />
      )}
    </main>
  );
}
