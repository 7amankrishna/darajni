import Image from "next/image";
import type { CSSProperties } from "react";

function canOptimize(src: string) {
  if (src.startsWith("/")) return true;
  try {
    return new URL(src).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
  style,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  if (canOptimize(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        className={className}
        style={style}
      />
    );
  }

  return (
    // Legacy product URLs are rendered without Next's optimizer until they
    // are moved into the product-images bucket.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
      style={style}
    />
  );
}
