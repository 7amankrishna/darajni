export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src) return "/logo.webp";

  // Pass through local static assets, data URLs, and vector SVGs
  if (src.startsWith("/") || src.startsWith("data:") || src.endsWith(".svg")) {
    return src;
  }

  // Prevent double wrapping
  if (src.startsWith("https://wsrv.nl")) {
    return src;
  }

  // Normalize legacy HTTP URLs for files.darajni.in
  let cleanSrc = src;
  if (cleanSrc.startsWith("http://files.darajni.in")) {
    cleanSrc = `https://files.darajni.in${cleanSrc.slice("http://files.darajni.in".length)}`;
  }

  // Decode URI first if already partially encoded so we don't double encode
  try {
    cleanSrc = decodeURI(cleanSrc);
  } catch {
    // keep as is
  }

  // Cap width to max 1600px to avoid oversized downloads on 4K/retina screens
  const targetWidth = Math.min(width || 800, 1600);
  const q = quality ? Math.min(Math.max(quality, 65), 85) : 78;

  // Use wsrv.nl CDN to resize, convert to WebP, and cache at Cloudflare edge
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanSrc)}&w=${targetWidth}&q=${q}&output=webp`;
}
