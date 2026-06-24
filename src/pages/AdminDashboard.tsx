import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import RatingStars from "../components/RatingStars";
import Seo from "../components/Seo";
import { formatPrice } from "../config/site";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../context/CatalogContext";
import { useReviews } from "../context/ReviewContext";
import { IMAGE_UPLOAD_ACCEPT } from "../lib/imageCompression";
import { AccountStatus, Design, ReviewStatus } from "../types";

type DesignDraft = Omit<Design, "id" | "createdAt" | "updatedAt">;
type AdminTab = "reviews" | "products" | "categories" | "users";

function blankDesign(category = ""): DesignDraft {
  return {
    name: "",
    slug: "",
    category,
    price: 0,
    fabric: "",
    description: "",
    tags: [],
    images: [],
    featured: false,
    available: true,
    color: "#caaa70",
  };
}

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
  const { categories, createDesign, updateDesign, uploadImage } = useCatalog();
  const [draft, setDraft] = useState<DesignDraft>(
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
      : blankDesign(categories[0]?.name),
  );
  const [tagText, setTagText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState("");

  useEffect(() => {
    if (!draft.category && categories[0]) {
      setDraft((current) => ({ ...current, category: categories[0].name }));
    }
  }, [categories, draft.category]);

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
    setUploadSummary("");
    const result = await uploadImage(file);
    setUploading(false);
    if (result.error) setMessage(result.error);
    if (result.url) {
      field("images", [...draft.images, result.url]);
      if (result.optimization) {
        const savedPercent = Math.max(
          0,
          Math.round(
            (1 - result.optimization.optimizedBytes / result.optimization.originalBytes) * 100,
          ),
        );
        const sizeKb = Math.max(1, Math.round(result.optimization.optimizedBytes / 1024));
        setUploadSummary(
          result.optimization.wasCompressed
            ? `Optimized to ${result.optimization.width}×${result.optimization.height} WebP (${sizeKb} KB, ${savedPercent}% smaller).`
            : `This image was already optimized (${sizeKb} KB).`,
        );
      }
    }
    event.target.value = "";
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.category) {
      setMessage("Create or choose a category first.");
      return;
    }
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
      <form onSubmit={save} className="glass-panel mx-auto my-3 w-full max-w-3xl p-5 sm:my-8 sm:p-8">
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
              required
            >
              <option value="" disabled>Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
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
                {uploading ? "Optimizing…" : "Upload image"}
                <input
                  type="file"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-white/32">
              JPG, PNG, and WebP files up to 25 MB are automatically resized and compressed before upload.
            </p>
            {uploadSummary && (
              <p className="mt-2 text-xs text-emerald-300/75">{uploadSummary}</p>
            )}
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
          <label className="flex items-center gap-3 rounded-xl border border-white/9 p-4">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => field("featured", event.target.checked)}
              className="h-5 w-5 accent-[#caaa70]"
            />
            <span className="text-sm text-white/65">Feature on collection</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/9 p-4">
            <input
              type="checkbox"
              checked={draft.available}
              onChange={(event) => field("available", event.target.checked)}
              className="h-5 w-5 accent-[#caaa70]"
            />
            <span className="text-sm text-white/65">Available for enquiry</span>
          </label>
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
  const { profile, adminUsers, moderateUser, signOut } = useAuth();
  const {
    designs,
    categories,
    createCategory,
    deleteCategory,
    deleteDesign,
  } = useCatalog();
  const { adminReviews, moderateReview, deleteReview } = useReviews();
  const [tab, setTab] = useState<AdminTab>("reviews");
  const [editing, setEditing] = useState<Design | null | undefined>(undefined);
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "all">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [userStatuses, setUserStatuses] = useState<Record<string, AccountStatus>>({});
  const [userMessages, setUserMessages] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [message, setMessage] = useState("");

  const filteredReviews = useMemo(
    () =>
      reviewFilter === "all"
        ? adminReviews
        : adminReviews.filter((review) => review.status === reviewFilter),
    [adminReviews, reviewFilter],
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return adminUsers;
    return adminUsers.filter((account) =>
      [
        account.fullName,
        account.email,
        account.phone,
        account.city,
        account.state,
        account.postalCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [adminUsers, userSearch]);

  const moderateReviewItem = async (id: string, status: "approved" | "rejected") => {
    const note = reviewNotes[id] || "";
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

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    const error = await createCategory(categoryName);
    setMessage(error || "Category added.");
    if (!error) setCategoryName("");
  };

  const removeCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete the custom category "${name}"?`)) return;
    const error = await deleteCategory(id);
    setMessage(error || "Category deleted.");
  };

  const applyUserModeration = async (
    userId: string,
    currentStatus: AccountStatus,
    currentMessage: string | null,
  ) => {
    const status = userStatuses[userId] || currentStatus;
    const privateMessage = userMessages[userId] ?? currentMessage ?? "";
    const error = await moderateUser(userId, status, privateMessage);
    setMessage(error || "User moderation updated.");
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "reviews", label: "Reviews" },
    { id: "products", label: "Products" },
    { id: "categories", label: "Categories" },
    { id: "users", label: "Users" },
  ];

  return (
    <main className="min-h-[70vh] py-10 sm:py-14">
      <Seo title="Admin dashboard" path="/admin" noIndex />
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Admin dashboard</p>
            <h1 className="font-display mt-3 text-5xl">Welcome, {profile?.fullName}</h1>
            <p className="mt-3 text-sm text-white/43">
              Manage products, categories, reviews and customer account safety.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="secondary-button">View storefront</a>
            <button type="button" onClick={() => void signOut()} className="secondary-button">Sign out</button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Products", designs.length],
            ["Pending reviews", adminReviews.filter((item) => item.status === "pending").length],
            ["Customers", adminUsers.filter((item) => item.role === "user").length],
            ["Restricted/blocked", adminUsers.filter((item) => ["restricted", "blocked"].includes(item.accountStatus)).length],
          ].map(([label, value]) => (
            <div key={String(label)} className="glass-panel p-5">
              <p className="text-xs uppercase tracking-wider text-white/35">{label}</p>
              <p className="font-display mt-2 text-4xl text-[#dfc184]">{value}</p>
            </div>
          ))}
        </div>

        {message && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-[#caaa70]/20 bg-[#caaa70]/5 p-4 text-sm text-[#e2c896]">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-white/9">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider ${
                tab === item.id ? "border-[#caaa70] text-[#e1c48c]" : "border-transparent text-white/35"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "reviews" && (
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
                      </div>
                      <div className="w-full shrink-0 lg:w-80">
                        <label htmlFor={`note-${review.id}`} className="field-label">Moderation note</label>
                        <textarea
                          id={`note-${review.id}`}
                          value={reviewNotes[review.id] ?? review.moderationNote ?? ""}
                          onChange={(event) =>
                            setReviewNotes((current) => ({ ...current, [review.id]: event.target.value }))
                          }
                          className="field min-h-24"
                          placeholder="Required when rejecting; optional when approving"
                        />
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => void moderateReviewItem(review.id, "approved")} className="primary-button !px-3">
                            Approve
                          </button>
                          <button type="button" onClick={() => void moderateReviewItem(review.id, "rejected")} className="danger-button !px-3">
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
                <EmptyState text={`No ${reviewFilter} reviews`} />
              )}
            </div>
          </section>
        )}

        {tab === "products" && (
          <section className="mt-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="primary-button"
                disabled={!categories.length}
              >
                Add product
              </button>
            </div>
            {!categories.length && (
              <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100/70">
                Add a category before creating products.
              </p>
            )}
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/9">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-white/[0.035] text-[0.68rem] uppercase tracking-wider text-white/38">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Images</th>
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
                      <td className="p-4">{design.images.length}</td>
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
              {!designs.length && <div className="p-12 text-center text-sm text-white/35">No products yet.</div>}
            </div>
          </section>
        )}

        {tab === "categories" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <form onSubmit={addCategory} className="glass-panel h-fit p-5 sm:p-6">
              <p className="eyebrow">Custom category</p>
              <h2 className="font-display mt-2 text-3xl">Add a category</h2>
              <p className="mt-3 text-xs leading-6 text-white/38">
                Fixed categories remain protected. Your custom categories appear beside them
                in filters and product forms.
              </p>
              <label htmlFor="new-category" className="field-label mt-6">Category name</label>
              <input
                id="new-category"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="field"
                required
                minLength={2}
                maxLength={60}
                placeholder="e.g. Co-ord Set"
              />
              <button type="submit" className="primary-button mt-4">Add category</button>
            </form>

            <div className="glass-panel p-5 sm:p-6">
              <h2 className="font-display text-3xl">Available categories</h2>
              <div className="mt-5 space-y-3">
                {categories.map((category) => {
                  const productCount = designs.filter((design) => design.category === category.name).length;
                  return (
                    <div key={category.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white/75">{category.name}</p>
                          <span className="status-pill bg-white/6 text-white/40">
                            {category.isSystem ? "Fixed" : "Custom"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-white/30">{productCount} product{productCount === 1 ? "" : "s"}</p>
                      </div>
                      {!category.isSystem && (
                        <button
                          type="button"
                          onClick={() => void removeCategory(category.id, category.name)}
                          className="danger-button !min-h-9 !px-4 !py-2"
                          disabled={productCount > 0}
                          title={productCount > 0 ? "Move products to another category before deleting." : undefined}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="mt-6">
            <label className="block max-w-md">
              <span className="field-label">Search users</span>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                className="field"
                placeholder="Name, email, phone, city…"
              />
            </label>

            <div className="mt-5 space-y-4">
              {filteredUsers.map((account) => {
                const selectedStatus = userStatuses[account.id] || account.accountStatus;
                const selectedMessage =
                  userMessages[account.id] ?? account.moderationMessage ?? "";
                const isSelf = account.id === profile?.id;
                return (
                  <article key={account.id} className="glass-panel p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="font-display text-2xl">{account.fullName}</h2>
                          <span className="status-pill bg-white/6 text-white/45">{account.role}</span>
                          <span className={`status-pill ${
                            account.accountStatus === "active"
                              ? "bg-emerald-400/10 text-emerald-200"
                              : account.accountStatus === "blocked"
                                ? "bg-rose-400/10 text-rose-200"
                                : "bg-amber-400/10 text-amber-200"
                          }`}>
                            {account.accountStatus}
                          </span>
                        </div>
                        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                          <UserDetail label="Email" value={account.email} />
                          <UserDetail label="Phone" value={account.phone || "Not provided"} />
                          <UserDetail label="City / State" value={[account.city, account.state].filter(Boolean).join(", ") || "Not provided"} />
                          <UserDetail label="Postal code" value={account.postalCode || "Not provided"} />
                          <div className="sm:col-span-2">
                            <UserDetail
                              label="Address"
                              value={[account.addressLine1, account.addressLine2].filter(Boolean).join(", ") || "Not provided"}
                            />
                          </div>
                        </dl>
                        <p className="mt-4 text-[0.68rem] text-white/28">
                          Joined {account.createdAt
                            ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(account.createdAt))
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                        <p className="field-label">Account moderation</p>
                        {isSelf || account.role === "admin" ? (
                          <p className="text-sm leading-6 text-white/40">
                            Administrator accounts cannot be moderated from this panel.
                          </p>
                        ) : (
                          <>
                            <select
                              value={selectedStatus}
                              onChange={(event) =>
                                setUserStatuses((current) => ({
                                  ...current,
                                  [account.id]: event.target.value as AccountStatus,
                                }))
                              }
                              className="field"
                            >
                              <option value="active">Active — normal access</option>
                              <option value="warned">Private warning — access remains</option>
                              <option value="restricted">Restricted — reviews disabled</option>
                              <option value="blocked">Blocked — account dashboard disabled</option>
                            </select>
                            <label htmlFor={`user-message-${account.id}`} className="field-label mt-4">
                              Private message to user
                            </label>
                            <textarea
                              id={`user-message-${account.id}`}
                              value={selectedMessage}
                              onChange={(event) =>
                                setUserMessages((current) => ({
                                  ...current,
                                  [account.id]: event.target.value,
                                }))
                              }
                              className="field min-h-24"
                              maxLength={500}
                              placeholder="Explain the warning or restriction clearly."
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void applyUserModeration(
                                  account.id,
                                  account.accountStatus,
                                  account.moderationMessage,
                                )
                              }
                              className="primary-button mt-3 w-full"
                            >
                              Apply moderation
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
              {!filteredUsers.length && <EmptyState text="No matching users" />}
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 py-16 text-center">
      <p className="font-display text-3xl text-white/42">{text}</p>
    </div>
  );
}

function UserDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-white/28">{label}</dt>
      <dd className="mt-1 break-words text-white/58">{value}</dd>
    </div>
  );
}
