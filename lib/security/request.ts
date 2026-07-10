import "server-only";

import { isIP } from "node:net";

export function getClientIp(request: Request) {
  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];
  const candidate = candidates.find((value) => value?.trim())?.trim();
  return candidate && isIP(candidate) ? candidate : "unknown";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return fetchSite !== "cross-site";

  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host");
  if (!forwardedHost) return false;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return (
      originUrl.host === forwardedHost &&
      (originUrl.protocol === requestUrl.protocol ||
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ===
          originUrl.protocol.slice(0, -1))
    );
  } catch {
    return false;
  }
}

export async function readJsonBody(
  request: Request,
  maximumBytes = 64 * 1024,
): Promise<unknown | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) return null;
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maximumBytes) return null;

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumBytes) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}
