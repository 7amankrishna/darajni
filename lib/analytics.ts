export const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-7QM5DMJ34G";

export function analyticsPagePath(pathname: string) {
  const path = pathname.split(/[?#]/)[0];
  // Only public browsing pages: never forward order tokens, emails or account URLs.
  if (path === "/" || /^\/(collection|about|support|size-guide|shipping-policy|returns-exchange|privacy|terms|requested-dresses|cart)\/?$/.test(path)) return path;
  if (/^\/design\/[a-z0-9-]+\/?$/.test(path)) return path;
  return null;
}
