"use client";

import {
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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
import type { EventBanner } from "@/types/commerce";

interface BannerDraft {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  isActive: boolean;
}

function blankDraft(sortOrder: number): BannerDraft {
  return {
    title: "",
    imageUrl: "",
    linkUrl: "/collection",
    sortOrder: String(sortOrder),
    isActive: true,
  };
}

function fromBanner(banner: EventBanner): BannerDraft {
  return {
    title: banner.title,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
    sortOrder: String(banner.sortOrder),
    isActive: banner.isActive,
  };
}

export function EventsManagement({
  banners,
}: {
  banners: EventBanner[];
}) {
  const router = useRouter();
  const nextOrder = useMemo(
    () => Math.max(0, ...banners.map((b) => b.sortOrder)) + 1,
    [banners],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventBanner | null>(null);
  const [draft, setDraft] = useState<BannerDraft>(() => blankDraft(nextOrder));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      // Ignore
    }
  };

  const setField = <K extends keyof BannerDraft>(
    key: K,
    value: BannerDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const createBanner = () => {
    setEditing(null);
    setDraft(blankDraft(nextOrder));
    sessionUploads.current = new Set();
    setOpen(true);
  };

  const editBanner = (banner: EventBanner) => {
    setEditing(banner);
    setDraft(fromBanner(banner));
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

    const previousImage = draft.imageUrl;
    if (previousImage && sessionUploads.current.has(previousImage)) {
      sessionUploads.current.delete(previousImage);
      void deleteUploads([previousImage]);
    }
    sessionUploads.current.add(result.url);
    setField("imageUrl", result.url);
    toast.success("Event banner uploaded.");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      imageUrl: draft.imageUrl.trim(),
      linkUrl: draft.linkUrl.trim(),
      sortOrder: Number(draft.sortOrder),
      isActive: draft.isActive,
    };
    const response = await fetch(
      editing
        ? `/api/admin/event-banners/${editing.id}`
        : "/api/admin/event-banners",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "The event banner could not be saved.");
      return;
    }

    const savedMedia = new Set<string>([payload.imageUrl]);
    const leftover = [...sessionUploads.current].filter(
      (url) => !savedMedia.has(url),
    );
    sessionUploads.current = new Set();
    if (leftover.length > 0) void deleteUploads(leftover);

    toast.success(editing ? "Event banner updated." : "Event banner created.");
    setOpen(false);
    router.refresh();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && sessionUploads.current.size > 0) {
      const leftover = [...sessionUploads.current];
      sessionUploads.current = new Set();
      void deleteUploads(leftover);
    }
    setOpen(next);
  };

  const removeBanner = async (banner: EventBanner) => {
    if (!window.confirm(`Remove the event banner "${banner.title}"?`)) return;

    const response = await fetch(`/api/admin/event-banners/${banner.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(result.error || "The event banner could not be removed.");
      return;
    }

    toast.success("Event banner removed.");
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Storefront campaigns</p>
          <h2 className="font-display mt-2 text-4xl">Events &amp; Launches</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Manage the banners shown in the Events slider on the homepage. Upload compressed images or use direct URLs.
          </p>
        </div>
        <button type="button" onClick={createBanner} className="primary-button">
          <Plus className="h-4 w-4" />
          Add event
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {banners.map((banner) => {
          return (
            <article key={banner.id} className="glass-panel overflow-hidden">
              <div className="relative aspect-[21/9] bg-black">
                <ProductImage src={banner.imageUrl} alt="" sizes="(max-width: 1024px) 100vw, 42vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span
                    className={`status-pill ${
                      banner.isActive
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-black/45 text-white/80"
                    }`}
                  >
                    {banner.isActive ? "Live" : "Hidden"}
                  </span>
                  <span className="status-pill bg-black/45 text-white/80">
                    Order {banner.sortOrder}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl">{banner.title}</h3>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => editBanner(banner)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:border-[#B8893B]/50"
                      aria-label={`Edit ${banner.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeBanner(banner)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-red-400/25 text-red-200 transition hover:bg-red-400/10"
                      aria-label={`Remove ${banner.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-xs text-text-secondary sm:grid-cols-2">
                  <p className="inline-flex min-w-0 items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-[#D9B56B]" />
                    <span className="truncate">{banner.linkUrl}</span>
                  </p>
                </div>
              </div>
            </article>
          );
        })}
        {!banners.length && (
          <div className="glass-panel grid min-h-64 place-items-center p-8 text-center lg:col-span-2">
            <div>
              <ImagePlus className="mx-auto h-9 w-9 text-[#B8893B]" />
              <h3 className="font-display mt-4 text-3xl">No event banners yet.</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                Add a new banner to show in the Events slider on the homepage.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit event banner" : "Create event banner"}
            </DialogTitle>
            <DialogDescription>
              Upload an image (which will be compressed automatically) or provide a direct image URL.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="banner-title" className="field-label">Title</label>
              <input
                id="banner-title"
                value={draft.title}
                onChange={(event) => setField("title", event.target.value)}
                className="field"
                minLength={2}
                maxLength={120}
                required
              />
            </div>
            <div>
              <label htmlFor="banner-order" className="field-label">Display order</label>
              <input
                id="banner-order"
                type="number"
                min="0"
                max="10000"
                value={draft.sortOrder}
                onChange={(event) => setField("sortOrder", event.target.value)}
                className="field"
                required
              />
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="banner-image-url" className="field-label">Banner image</label>
              <div className="flex gap-2">
                <input
                  id="banner-image-url"
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
              <label htmlFor="banner-link" className="field-label">Target link</label>
              <input
                id="banner-link"
                value={draft.linkUrl}
                onChange={(event) => setField("linkUrl", event.target.value)}
                className="field"
                placeholder="/collection"
                maxLength={2048}
                required
              />
            </div>
            
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm text-text-secondary sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                className="accent-[#B8893B]"
              />
              Active on storefront
            </label>
            
            <button
              type="submit"
              disabled={saving || uploading || !draft.imageUrl.trim()}
              className="primary-button sm:col-span-2 mt-4"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              ) : editing ? "Save banner" : "Create banner"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
