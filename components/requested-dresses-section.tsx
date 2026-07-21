"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/product/product-image";
import {
  IMAGE_UPLOAD_ACCEPT,
  optimizeImage,
  type OptimizedImage,
} from "@/lib/imageCompression";
import type { RequestedDress } from "@/types/commerce";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RequestedDressesSection({
  initialRequests,
}: {
  initialRequests: RequestedDress[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState(initialRequests);
  const [optimized, setOptimized] = useState<OptimizedImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreparing(true);
    try {
      // Always transcode public submissions to reduce size and remove EXIF metadata.
      const result = await optimizeImage(file, { forceCompression: true });
      setOptimized(result);
      setPreviewUrl(URL.createObjectURL(result.file));
    } catch (error) {
      setOptimized(null);
      setPreviewUrl(null);
      event.target.value = "";
      toast.error(
        error instanceof Error ? error.message : "The image could not be prepared.",
      );
    } finally {
      setPreparing(false);
    }
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!optimized || !publicConsent || !termsAccepted) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", optimized.file);
      formData.set("description", description.trim());
      formData.set("publicConsent", "true");
      formData.set("termsAccepted", "true");

      const response = await fetch("/api/requested-dresses", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        request?: RequestedDress;
        error?: string;
      };
      if (!response.ok || !result.request) {
        throw new Error(result.error || "Your dress request could not be posted.");
      }

      setRequests((current) => [result.request!, ...current].slice(0, 12));
      setOptimized(null);
      setPreviewUrl(null);
      setDescription("");
      setPublicConsent(false);
      setTermsAccepted(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Your reference dress is now visible in Requested dresses.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Your request could not be posted.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="requested-dresses"
      data-reveal
      className="bg-[#171717] py-20 text-[#FFF8EF] sm:py-28"
      aria-labelledby="requested-dresses-title"
    >
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-[#E7C47F]">
              Your inspiration, our next idea
            </p>
            <h2
              id="requested-dresses-title"
              className="font-display mt-4 text-5xl leading-none sm:text-6xl"
            >
              Request a dress
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/72">
              Upload a dress-only reference image of a design you would like DARAJNI to make.
              Your compressed image and note will be showcased publicly in
              the Requested dresses section on our homepage below.
            </p>

            <div className="mt-7 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5 backdrop-blur-sm">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <h3 className="font-bold text-amber-100">Important instructions for public dress requests</h3>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-50/90">
                    <li>
                      <strong className="text-amber-200">Do NOT upload personal photos:</strong> Do not upload images containing yourself, your face, children, address, or private personal information.
                    </li>
                    <li>
                      <strong className="text-amber-200">Public showcase on homepage:</strong> Uploaded reference dresses will be showcased publicly in the Requested dresses section on the homepage.
                    </li>
                    <li>
                      <strong className="text-amber-200">User responsibility & liability:</strong> Users are solely responsible for their uploads and activity. DARAJNI takes no charge or liability for user-submitted images or content.
                    </li>
                    <li>
                      <strong className="text-amber-200">Dress inspiration only:</strong> Uploading only dress reference images you own or have rights to share. Posting does not guarantee production.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={submitRequest}
            className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-5 shadow-2xl sm:p-7"
          >
            <label
              htmlFor="requested-dress-image"
              className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[#D9B56B]/55 bg-black/25 transition hover:border-[#E7C47F]"
            >
              {previewUrl ? (
                <div className="relative aspect-[4/3]">
                  {/* Preview is a local object URL and is never sent until submission. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Selected dress reference preview"
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold">
                    Choose another
                  </span>
                </div>
              ) : (
                <span className="grid min-h-64 place-items-center p-8 text-center">
                  <span>
                    {preparing ? (
                      <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#E7C47F]" />
                    ) : (
                      <ImagePlus className="mx-auto h-9 w-9 text-[#E7C47F]" />
                    )}
                    <span className="mt-4 block font-display text-3xl">
                      {preparing ? "Compressing your image…" : "Choose a dress image"}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-white/60">
                      JPG, PNG, or WebP up to 25 MB. It will be resized, converted,
                      and stripped of embedded metadata before upload.
                    </span>
                  </span>
                </span>
              )}
              <input
                ref={fileInputRef}
                id="requested-dress-image"
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                onChange={(event) => void chooseImage(event)}
                className="sr-only"
                disabled={preparing || submitting}
                required={!optimized}
              />
            </label>

            {optimized && (
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Prepared at {optimized.width} × {optimized.height}: {formatBytes(optimized.originalBytes)} → {formatBytes(optimized.optimizedBytes)}
              </p>
            )}

            <div className="mt-5">
              <label htmlFor="request-description" className="text-xs font-bold uppercase tracking-wide text-white/75">
                What do you like about it? <span className="font-normal normal-case text-white/45">(optional)</span>
              </label>
              <textarea
                id="request-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={160}
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#D9B56B]"
                placeholder="For example: I love the neckline and would like a similar style in maroon."
              />
              <p className="mt-1 text-right text-[0.68rem] text-white/40">{description.length}/160</p>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-5 text-white/70">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  checked={publicConsent}
                  onChange={(event) => setPublicConsent(event.target.checked)}
                  className="mt-1 accent-[#B8893B]"
                  required
                />
                <span>I understand this image and note will be publicly visible on the DARAJNI homepage.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 accent-[#B8893B]"
                  required
                />
                <span>
                  I am responsible for this upload and agree to the{" "}
                  <Link href="/terms" className="font-semibold text-[#E7C47F] underline">
                    Terms of use
                  </Link>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!optimized || !publicConsent || !termsAccepted || preparing || submitting}
              className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Posting request…</>
              ) : (
                <><Upload className="h-4 w-4" />Post to Requested dresses</>
              )}
            </button>
          </form>
        </div>

        <div className="mt-16 border-t border-white/12 pt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7C47F]">
                <Sparkles className="h-4 w-4" /> Community inspiration
              </p>
              <h3 className="font-display mt-3 text-4xl sm:text-5xl">Requested dresses</h3>
            </div>
            <p className="max-w-md text-xs leading-6 text-white/55">
              These references were submitted publicly by visitors. DARAJNI does not endorse ownership or guarantee production of any design shown.
            </p>
          </div>

          {requests.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {requests.map((request) => (
                <article key={request.id} className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06]">
                  <div className="relative aspect-[4/5] bg-black/30">
                    <ProductImage
                      src={request.imageUrl}
                      alt={request.description ? `Requested dress: ${request.description}` : "Publicly requested dress reference"}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-[#D9B56B]">Public request</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/72">
                      {request.description || "Dress reference shared for inspiration."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <div>
                <ImagePlus className="mx-auto h-8 w-8 text-[#D9B56B]" />
                <p className="font-display mt-4 text-3xl">Be the first to share a dress reference.</p>
                <p className="mt-2 text-sm text-white/55">Your public request will appear here after upload.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function RequestedDressesHomepageTeaser({
  requests,
}: {
  requests: RequestedDress[];
}) {
  const displayRequests = requests.slice(0, 4);

  return (
    <section className="bg-[#E6D5C3]/40 py-20 sm:py-28 text-[#3A2E25]">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-[#A88656]">Community Inspiration Studio</p>
            <h2 className="font-display mt-3 text-4xl font-light text-[#111111] sm:text-6xl">
              Requested Dresses Preview
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6F6255]">
              Dress references submitted by clients seeking custom tailoring. Upload your favorite design inspiration to be reviewed by our Bihar Sharif atelier.
            </p>
          </div>
          <Link href="/requested-dresses" className="primary-button shrink-0">
            Submit Your Dress Request
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>

        {displayRequests.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayRequests.map((request) => (
              <article
                key={request.id}
                className="group relative overflow-hidden rounded-2xl border border-[#E2D7CB] bg-[#F8F5F2] shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#E6D5C3]">
                  <ProductImage
                    src={request.imageUrl}
                    alt={request.description || "Requested dress reference"}
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-[#111111]/85 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-[#C8A97E] backdrop-blur-sm">
                      In Studio Review
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-xs leading-relaxed text-[#5F5348]">
                    {request.description || "Reference design shared for custom bridal tailoring."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-[#C8A97E]/50 bg-[#F8F5F2] p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#C8A97E]" />
            <h3 className="font-display mt-3 text-3xl text-[#111111]">Be the First to Request a Design</h3>
            <p className="mt-2 text-sm text-[#6F6255]">Upload an inspiration photo to request custom tailoring from DARAJNI.</p>
            <Link href="/requested-dresses" className="primary-button mt-6">
              Upload Inspiration Image
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
