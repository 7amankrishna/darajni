"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Lock,
  Sparkles,
  Upload,
  UserCheck,
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
import { supabase } from "@/lib/supabase/client";
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
  const [userChecked, setUserChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!supabase) {
      setUserChecked(true);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(Boolean(user && !user.is_anonymous));
      setUserChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user && !session.user.is_anonymous));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAuthenticated) {
      toast.error("Only registered DARAJNI accounts can upload dress requests. Please sign in or register.");
      event.target.value = "";
      return;
    }

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
    if (!isAuthenticated) {
      toast.error("Only registered accounts can upload dress requests. Please sign in or register.", {
        action: {
          label: "Sign In",
          onClick: () => window.location.href = "/account",
        },
      });
      return;
    }

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
      if (response.status === 401) {
        toast.error("Only registered accounts can upload dress requests. Please sign in or register.", {
          action: {
            label: "Sign In",
            onClick: () => window.location.href = "/account",
          },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Your dress request could not be posted.");
      }

      setOptimized(null);
      setPreviewUrl(null);
      setDescription("");
      setPublicConsent(false);
      setTermsAccepted(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Your dress request has been submitted successfully! It will be reviewed by our admin team before being published.");
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
      className="bg-[#FAF7F2] py-20 text-[#1E1E1E] transition-colors dark:bg-[#100D0B] dark:text-[#F7EADB] sm:py-28"
      aria-labelledby="requested-dresses-title"
    >
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-[#C8A97E]">
              Your inspiration, our next idea
            </p>
            <h2
              id="requested-dresses-title"
              className="font-display mt-4 text-5xl leading-none sm:text-6xl"
            >
              Request a dress
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
              Upload a dress-only reference image of a design you would like DARAJNI to make.
              Only registered DARAJNI accounts can submit requests so we have your contact details for custom tailoring.
            </p>

            <div className="mt-7 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-sm dark:border-amber-300/40 dark:bg-amber-400/10">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <h3 className="font-bold text-amber-950 dark:text-amber-100">Important instructions for dress requests</h3>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-900/90 dark:text-amber-50/90">
                    <li>
                      <strong className="text-amber-950 dark:text-amber-200">Registered users only:</strong> You must be signed in with a registered DARAJNI account to upload images.
                    </li>
                    <li>
                      <strong className="text-amber-950 dark:text-amber-200">Do NOT upload personal photos:</strong> Do not upload images containing yourself, your face, children, address, or private personal information.
                    </li>
                    <li>
                      <strong className="text-amber-950 dark:text-amber-200">Admin review & public showcase:</strong> Uploaded reference dresses are reviewed by our admin team before being showcased publicly.
                    </li>
                    <li>
                      <strong className="text-amber-950 dark:text-amber-200">User responsibility & liability:</strong> Users are solely responsible for their uploads and activity. DARAJNI takes no charge or liability for user-submitted images.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {userChecked && !isAuthenticated ? (
            <div className="rounded-[2rem] border border-[#E8E2DA] bg-white p-8 text-center shadow-xl dark:border-[#3B3026] dark:bg-[#1B1612] sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5EFEB] text-[#C8A97E] dark:bg-[#241D17]">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="font-display mt-6 text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                Registered accounts only
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
                Only registered DARAJNI customers can submit reference dress images. Please sign in or create an account so our team has your verified contact details for custom tailoring.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/account"
                  className="primary-button w-full sm:w-auto px-8 py-3.5 text-xs font-bold uppercase tracking-wider"
                >
                  <UserCheck className="h-4 w-4" />
                  Sign In or Create Account
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={submitRequest}
              className="rounded-[2rem] border border-[#E8E2DA] bg-white p-5 shadow-xl dark:border-[#3B3026] dark:bg-[#1B1612] sm:p-7"
            >
              <label
                htmlFor="requested-dress-image"
                className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[#C8A97E]/55 bg-[#F5EFEB] transition hover:border-[#C8A97E] dark:bg-[#241D17]"
              >
                {previewUrl ? (
                  <div className="relative aspect-[4/3]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selected dress reference preview"
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                      Choose another
                    </span>
                  </div>
                ) : (
                  <span className="grid min-h-64 place-items-center p-8 text-center">
                    <span>
                      {preparing ? (
                        <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#C8A97E]" />
                      ) : (
                        <ImagePlus className="mx-auto h-9 w-9 text-[#C8A97E]" />
                      )}
                      <span className="mt-4 block font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                        {preparing ? "Compressing your image…" : "Choose a dress image"}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-[#666666] dark:text-[#B8A898]">
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
                  disabled={preparing || submitting || !isAuthenticated}
                  required={!optimized}
                />
              </label>

              {optimized && (
                <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Prepared at {optimized.width} × {optimized.height}: {formatBytes(optimized.originalBytes)} → {formatBytes(optimized.optimizedBytes)}
                </p>
              )}

              <div className="mt-5">
                <label htmlFor="request-description" className="text-xs font-bold uppercase tracking-wide text-[#1E1E1E] dark:text-[#F7EADB]">
                  What do you like about it? <span className="font-normal normal-case text-[#666666] dark:text-[#B8A898]">(optional)</span>
                </label>
                <textarea
                  id="request-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={160}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#E8E2DA] bg-[#F5EFEB] px-4 py-3 text-sm text-[#1E1E1E] outline-none transition placeholder:text-[#666666]/60 focus:border-[#C8A97E] dark:border-[#3B3026] dark:bg-[#241D17] dark:text-[#F7EADB] dark:placeholder:text-[#B8A898]/50"
                  placeholder="For example: I love the neckline and would like a similar style in maroon."
                />
                <p className="mt-1 text-right text-[0.68rem] text-[#666666] dark:text-[#B8A898]">{description.length}/160</p>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-5 text-[#666666] dark:text-[#B8A898]">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E2DA] bg-[#FAF7F2] p-3 dark:border-[#3B3026] dark:bg-[#241D17]">
                  <input
                    type="checkbox"
                    checked={publicConsent}
                    onChange={(event) => setPublicConsent(event.target.checked)}
                    className="mt-1 accent-[#C8A97E]"
                    required
                  />
                  <span>I understand this image and note will be publicly visible on the DARAJNI homepage after admin approval.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E2DA] bg-[#FAF7F2] p-3 dark:border-[#3B3026] dark:bg-[#241D17]">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-1 accent-[#C8A97E]"
                    required
                  />
                  <span>
                    I am responsible for this upload and agree to the{" "}
                    <Link href="/terms" className="font-semibold text-[#C8A97E] underline">
                      Terms of use
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!optimized || !publicConsent || !termsAccepted || preparing || submitting || !isAuthenticated}
                className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Posting request…</>
                ) : (
                  <><Upload className="h-4 w-4" />Post to Requested dresses</>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-16 border-t border-[#E8E2DA] pt-10 dark:border-[#3B3026]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8A97E]">
                <Sparkles className="h-4 w-4" /> Community inspiration
              </p>
              <h3 className="font-display mt-3 text-4xl sm:text-5xl">Requested dresses</h3>
            </div>
            <p className="max-w-md text-xs leading-6 text-[#666666] dark:text-[#B8A898]">
              These references were submitted publicly by visitors and approved by our master artisans. DARAJNI does not endorse ownership or guarantee production.
            </p>
          </div>

          {requests.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {requests.map((request) => (
                <article key={request.id} className="overflow-hidden rounded-2xl border border-[#E8E2DA] bg-white shadow-sm dark:border-[#3B3026] dark:bg-[#1B1612]">
                  <div className="relative aspect-[4/5] bg-[#F5EFEB] dark:bg-[#241D17]">
                    <ProductImage
                      src={request.imageUrl}
                      alt={request.description ? `Requested dress: ${request.description}` : "Publicly requested dress reference"}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-[#C8A97E]">Approved Request</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#666666] dark:text-[#B8A898]">
                      {request.description || "Dress reference shared for inspiration."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 grid min-h-56 place-items-center rounded-2xl border border-dashed border-[#C8A97E]/50 bg-white p-8 text-center dark:bg-[#1B1612]">
              <div>
                <ImagePlus className="mx-auto h-8 w-8 text-[#C8A97E]" />
                <p className="font-display mt-4 text-3xl">Be the first to share a dress reference.</p>
                <p className="mt-2 text-sm text-[#666666] dark:text-[#B8A898]">Your public request will appear here after approval.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
