import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/product-images/**",
      },
    ],
  },
  async headers() {
    const immutableAssetHeaders = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];

    return [
      {
        source: "/models/:path*",
        headers: immutableAssetHeaders,
      },
      {
        source: "/:asset(favicon|apple-touch-icon|icon-192|icon-512|logo).:ext(png|webp|ico)",
        headers: immutableAssetHeaders,
      },
      {
        source: "/og-cover.svg",
        headers: immutableAssetHeaders,
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
