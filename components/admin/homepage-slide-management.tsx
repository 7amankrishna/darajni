"use client";

import {
  CalendarClock,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/product/product-image";
import { optimizeImage } from "@/lib/imageCompression";
import { isManagedStorageUrl } from "@/lib/media-url";
import type { HomepageSlide } from "@/types/commerce";

interface SlideDraft {
  title: string;
  eyebrow: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  linkUrl: string;
  ctaLabel: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function blankDraft(sortOrder: number): SlideDraft {
  return {
    title: "",
    eyebrow: "New launch",
    description: "",
    imageUrl: "",
    videoUrl: "",
    linkUrl: "/collection",
    ctaLabel: "Explore now",
    sortOrder: String(sortOrder),
    startsAt: "",
    endsAt: "",
    isActive: true,
  };
}

function fromSlide(slide: HomepageSlide): SlideDraft {
  return {
    title: slide.title,
    eyebrow: slide.eyebrow || "",
    description: slide.description || "",
    imageUrl: slide.imageUrl,
    videoUrl: slide.videoUrl || "",
    linkUrl: slide.linkUrl,
    ctaLabel: slide.ctaLabel,
    sortOrder: String(slide.sortOrder),
    startsAt: toDateInput(slide.startsAt),
    endsAt: toDateInput(slide.endsAt),
    isActive: slide.isActive,
  };
}

function statusFor(slide: HomepageSlide) {
  if (!slide.isActive) return "Hidden";
  const now = Date.now();
  if (slide.startsAt && new Date(slide.startsAt).getTime() > now) return "Scheduled";
  if (slide.endsAt && new Date(slide.endsAt).getTime() <= now) return "Ended";
  return "Live";
}

export function HomepageSlideManagement({
  slides,
}: {
  slides: HomepageSlide[];
}) {
  const router = useRouter();
  const nextOrder = useMemo(
    () => Math.max(0, ...slides.map((slide) => slide.sortOrder)) + 1,
    [slides],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HomepageSlide | null>(null);
  const [draft, setDraft] = useState<SlideDraft>(() => blankDraft(nextOrder));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Storage URLs uploaded during the current dialog session that have not yet
  // been persisted to a slide. Tracked so we can delete them from the bucket
  // when the user replaces them before saving, or cancels the dialog —
  // otherwise they'd be orphaned in storage. Saved originals are intentionally
  // NOT tracked here; their deletion is deferred to the server-side PUT diff so
  // a cancelled edit can never delete media the storefront still uses.
  const sessionUploads = useRef<Set<string>>(new Set());

  const deleteUploads = async (urls: string[]) => {
    const managed = urls.filter((url) => isManagedStorageUrl(url));
    if (managed.length === 0) return;
    try {
      await fetch("/api/admin/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: managed }),
      });
    } catch {
      // Best-effort cleanup; failures only cost storage and shouldn't surface
      // a toast while the user is cancelling or saving.
    }
  };

  const setField = <K extends keyof SlideDraft>(
    key: K,
    value: SlideDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const createSlide = () => {
    setEditing(null);
    setDraft(blankDraft(nextOrder));
    sessionUploads.current = new Set();
    setOpen(true);
  };

  const editSlide = (slide: HomepageSlide) => {
    setEditing(slide);
    setDraft(fromSlide(slide));
    sessionUploads.current = new Set();
    setOpen(true);
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    let uploadFile: File = file;
    try {
      const optimized = await optimizeImage(file, { forceCompression: true });
      uploadFile = optimized.file;
    } catch (error) {
      setUploading(false);
      toast.error(
        error instanceof Error ? error.message : "That image could not be processed.",
      );
      return;
    }
    const formData = new FormData();
    formData.set("file", uploadFile);
    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { url?: string; error?: string };
    setUploading(false);
    if (!response.ok || !result.url) {
      toast.error(result.error || "Image upload failed.");
      return;
    }

    // The slide holds a single image, so a new upload replaces the current one.
    // If the current image was uploaded this session, delete the orphan now; a
    // saved original is left for the server-side PUT diff to clean up on save.
    const previousImage = draft.imageUrl;
    if (previousImage && sessionUploads.current.has(previousImage)) {
      sessionUploads.current.delete(previousImage);
      void deleteUploads([previousImage]);
    }
    sessionUploads.current.add(result.url);
    setField("imageUrl", result.url);
    toast.success("Launch image uploaded.");
  };

  const uploadVideo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/admin/uploads?kind=video", { method: "POST", body: formData });
    const result = (await response.json()) as { url?: string; error?: string };
    setUploading(false);
    if (!response.ok || !result.url) {
      toast.error(result.error || "Video upload failed.");
      return;
    }
    // If the current video was uploaded this session and is now being replaced,
    // delete the orphaned object immediately; a saved original is left for the
    // server-side PUT diff to clean up on save.
    const previousVideo = draft.videoUrl;
    if (previousVideo && sessionUploads.current.has(previousVideo)) {
      sessionUploads.current.delete(previousVideo);
      void deleteUploads([previousVideo]);
    }
    sessionUploads.current.add(result.url);
    setField("videoUrl", result.url);
    toast.success("Featured video uploaded.");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      eyebrow: draft.eyebrow.trim() || null,
      description: draft.description.trim() || null,
      imageUrl: draft.imageUrl.trim(),
      videoUrl: draft.videoUrl.trim() || null,
      linkUrl: draft.linkUrl.trim(),
      ctaLabel: draft.ctaLabel.trim(),
      sortOrder: Number(draft.sortOrder),
      startsAt: fromDateInput(draft.startsAt),
      endsAt: fromDateInput(draft.endsAt),
      isActive: draft.isActive,
    };
    const response = await fetch(
      editing
        ? `/api/admin/homepage-slides/${editing.id}`
        : "/api/admin/homepage-slides",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "The homepage slide could not be saved.");
      return;
    }

    // Delete any session-uploaded objects that did not end up in the saved
    // slide (replaced before save). The ones that were saved are now
    // persisted, so drop them from the tracker without deleting.
    const savedMedia = new Set<string>([
      payload.imageUrl,
      ...(payload.videoUrl ? [payload.videoUrl] : []),
    ]);
    const leftover = [...sessionUploads.current].filter(
      (url) => !savedMedia.has(url),
    );
    sessionUploads.current = new Set();
    if (leftover.length > 0) void deleteUploads(leftover);

    toast.success(editing ? "Homepage slide updated." : "Homepage slide created.");
    setOpen(false);
    router.refresh();
  };

  // Called only on a user-initiated close (overlay/escape/close button), never
  // on the programmatic setOpen(false) after a successful save. Any session
  // uploads still tracked here were never saved, so delete them to avoid
  // orphans.
  const handleOpenChange = (next: boolean) => {
    if (!next && sessionUploads.current.size > 0) {
      const leftover = [...sessionUploads.current];
      sessionUploads.current = new Set();
      void deleteUploads(leftover);
    }
    setOpen(next);
  };

  const removeSlide = async (slide: HomepageSlide) => {
    if (!window.confirm(`Remove the homepage slide "${slide.title}"?`)) return;

    const response = await fetch(`/api/admin/homepage-slides/${slide.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(result.error || "The homepage slide could not be removed.");
      return;
    }

    toast.success("Homepage slide removed.");
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Storefront campaigns</p>
          <h2 className="font-display mt-2 text-4xl">Homepage launches</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Create product launches and campaign slides, set their order and
            publish window, upload the image, and choose exactly where each
            call-to-action links.
          </p>
        </div>
        <button type="button" onClick={createSlide} className="primary-button">
          <Plus className="h-4 w-4" />
          Add launch
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {slides.map((slide) => {
          const status = statusFor(slide);
          return (
            <article key={slide.id} className="glass-panel overflow-hidden">
              <div className="relative aspect-[16/8] bg-black">
                <ProductImage src={slide.imageUrl} alt="" sizes="(max-width: 1024px) 100vw, 42vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span
                    className={`status-pill ${
                      status === "Live"
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-black/45 text-white/80"
                    }`}
                  >
                    {status}
                  </span>
                  <span className="status-pill bg-black/45 text-white/80">
                    Order {slide.sortOrder}
                  </span>
                </div>
                <p className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#E7C47F]">
                  {slide.eyebrow || "Homepage launch"}
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-3xl">{slide.title}</h3>
                    {slide.description && (
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {slide.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => editSlide(slide)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:border-[#B8893B]/50"
                      aria-label={`Edit ${slide.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSlide(slide)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-red-400/25 text-red-200 transition hover:bg-red-400/10"
                      aria-label={`Remove ${slide.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 text-xs text-text-secondary sm:grid-cols-2">
                  <p className="inline-flex min-w-0 items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-[#D9B56B]" />
                    <span className="truncate">{slide.ctaLabel} → {slide.linkUrl}</span>
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#D9B56B]" />
                    {slide.startsAt || slide.endsAt ? "Scheduled window" : "Always available"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
        {!slides.length && (
          <div className="glass-panel grid min-h-64 place-items-center p-8 text-center lg:col-span-2">
            <div>
              <ImagePlus className="mx-auto h-9 w-9 text-[#B8893B]" />
              <h3 className="font-display mt-4 text-3xl">No homepage launches yet.</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                Add a launch for a new product, seasonal collection, or offer.
                It stays hidden until you mark it active and its schedule begins.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit homepage launch" : "Create homepage launch"}
            </DialogTitle>
            <DialogDescription>
              Use a product page path such as /design/your-product-slug, or a
              secure HTTPS link for an external campaign.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="slide-title" className="field-label">Title</label>
              <input
                id="slide-title"
                value={draft.title}
                onChange={(event) => setField("title", event.target.value)}
                className="field"
                minLength={2}
                maxLength={120}
                required
              />
            </div>
            <div>
              <label htmlFor="slide-eyebrow" className="field-label">Eyebrow</label>
              <input
                id="slide-eyebrow"
                value={draft.eyebrow}
                onChange={(event) => setField("eyebrow", event.target.value)}
                className="field"
                placeholder="New launch"
                maxLength={60}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="slide-description" className="field-label">Description</label>
              <textarea
                id="slide-description"
                value={draft.description}
                onChange={(event) => setField("description", event.target.value)}
                className="field min-h-28"
                placeholder="A short message for this product launch."
                maxLength={320}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="slide-image-url" className="field-label">Launch image</label>
              <div className="flex gap-2">
                <input
                  id="slide-image-url"
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setField("imageUrl", event.target.value)}
                  className="field"
                  placeholder="Upload an image or paste an HTTPS URL"
                  required
                />
                <label className="secondary-button shrink-0 cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <span className="hidden sm:inline">Upload</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void uploadImage(event)}
                    className="sr-only"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="slide-video-url" className="field-label">Featured video</label>
              <div className="flex gap-2">
                <input
                  id="slide-video-url"
                  type="url"
                  value={draft.videoUrl}
                  onChange={(event) => setField("videoUrl", event.target.value)}
                  className="field"
                  placeholder="Upload an MP4/WebM video or paste an HTTPS URL"
                />
                <label className="secondary-button shrink-0 cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  <span className="hidden sm:inline">Upload</span>
                  <input type="file" accept="video/mp4,video/webm" onChange={(event) => void uploadVideo(event)} className="sr-only" disabled={uploading} />
                </label>
              </div>
              <p className="mt-2 text-xs text-text-secondary">Optional. The launch image remains the video poster.</p>
            </div>
            <div>
              <label htmlFor="slide-cta" className="field-label">Button label</label>
              <input
                id="slide-cta"
                value={draft.ctaLabel}
                onChange={(event) => setField("ctaLabel", event.target.value)}
                className="field"
                minLength={2}
                maxLength={40}
                required
              />
            </div>
            <div>
              <label htmlFor="slide-link" className="field-label">Button link</label>
              <input
                id="slide-link"
                value={draft.linkUrl}
                onChange={(event) => setField("linkUrl", event.target.value)}
                className="field"
                placeholder="/design/product-slug"
                maxLength={2048}
                required
              />
            </div>
            <div>
              <label htmlFor="slide-order" className="field-label">Display order</label>
              <input
                id="slide-order"
                type="number"
                min="0"
                max="10000"
                value={draft.sortOrder}
                onChange={(event) => setField("sortOrder", event.target.value)}
                className="field"
                required
              />
            </div>
            <label className="flex items-center gap-3 self-end rounded-xl border border-border p-3 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                className="accent-[#B8893B]"
              />
              Visible when its schedule is live
            </label>
            <div>
              <label htmlFor="slide-start" className="field-label">Start date & time</label>
              <input
                id="slide-start"
                type="datetime-local"
                value={draft.startsAt}
                onChange={(event) => setField("startsAt", event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="slide-end" className="field-label">End date & time</label>
              <input
                id="slide-end"
                type="datetime-local"
                value={draft.endsAt}
                onChange={(event) => setField("endsAt", event.target.value)}
                className="field"
              />
            </div>
            <button
              type="submit"
              disabled={saving || uploading || !draft.imageUrl.trim()}
              className="primary-button sm:col-span-2"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              ) : editing ? "Save launch" : "Create launch"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
