import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/data/catalog";
import {
  createShiprocketCheckoutSignature,
  getShiprocketCheckoutCredentials,
  SHIPROCKET_CHECKOUT_BASE_URL,
  toShiprocketVariantId,
} from "@/lib/shiprocket-checkout";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
import { shiprocketCheckoutSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";
// The Shiprocket access-token call can take several seconds on a cold
// upstream connection. The default serverless function duration (10s) is
// shorter than the fetch timeout below, so a slow/hanging call let the
// platform kill the function and return an HTML 502 page the client could
// not parse as JSON. Raise the budget so the route can always answer with
// a structured response instead.
export const maxDuration = 60;

const RESPONSE_LIMIT_BYTES = 64 * 1024;

async function readResponse(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > RESPONSE_LIMIT_BYTES) return null;
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > RESPONSE_LIMIT_BYTES) return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("Forbidden.", 403);

  const limit = await rateLimitRequest(request, RATE_LIMITS.checkout);
  if (!limit.success) return rateLimitError(limit);

  const credentials = getShiprocketCheckoutCredentials();
  if (!credentials) {
    return apiError("Shiprocket Checkout is temporarily unavailable.", 503);
  }

  const parsed = shiprocketCheckoutSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError("Your cart could not be prepared.", 400);

  const catalog = await getCatalog().catch(() => null);
  if (!catalog) {
    return apiError("Checkout is temporarily unavailable.", 503);
  }
  const { products } = catalog;
  const requestedItems = parsed.data.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return { item, product };
  });
  if (
    requestedItems.some(
      ({ item, product }) =>
        !product || !product.sizes.includes(item.size) || product.stock < item.quantity,
    )
  ) {
    return apiError("A cart product is no longer available.", 409);
  }

  const origin = new URL(request.url).origin;
  const payload = {
    cart_data: {
      items: parsed.data.items.map((item) => ({
        variant_id: toShiprocketVariantId(item.productId, item.size),
        quantity: item.quantity,
      })),
    },
    redirect_url: `${origin}/shiprocket/complete`,
    timestamp: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);
  const signature = createShiprocketCheckoutSignature(body);
  if (!signature) {
    return apiError("Shiprocket Checkout is temporarily unavailable.", 503);
  }

  try {
    const response = await fetch(
      `${SHIPROCKET_CHECKOUT_BASE_URL}/api/v1/access-token/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": credentials.apiKey,
          "X-Api-HMAC-SHA256": signature,
        },
        body,
        cache: "no-store",
        // Keep this below the function duration budget so a hanging
        // upstream call fails as a structured 502 here instead of being
        // killed by the platform and returned as an HTML error page.
        signal: AbortSignal.timeout(8_000),
      },
    );
    const responseBody = await readResponse(response);
    const result = responseBody?.result as Record<string, unknown> | undefined;
    const token =
      (typeof responseBody?.token === "string" && responseBody.token) ||
      (typeof result?.token === "string" && result.token) ||
      null;

    if (!response.ok || !token || token.length > 8_192) {
      return apiError("Shiprocket Checkout could not be started.", 502);
    }

    return NextResponse.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return internalApiError(
      "shiprocket-checkout-token",
      error,
      "Shiprocket Checkout could not be started.",
      502,
    );
  }
}
