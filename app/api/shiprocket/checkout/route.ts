import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/data/catalog";
import { resolveShiprocketCheckoutEnvironment } from "@/lib/config/server-env";
import {
  createShiprocketCheckoutSignature,
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
// Give the token-mint path headroom: it makes one outbound call to
// checkout-api.shiprocket.com. Without this, Vercel's default function
// duration can race the upstream fetch and surface a blank edge 502.
export const maxDuration = 30;

// Keep the upstream timeout comfortably inside the function maxDuration so a
// slow Shiprocket response returns our diagnosable 502 JSON instead of being
// killed by the platform (which would surface as an opaque "error code: 502").
const UPSTREAM_TIMEOUT_MS = 8_000;

// The Fastrr access-token success shape was never observed as a 200 (the
// upstream returned 500 while the seller account/channel was unconfigured), so
// the token field name is not pinned by the official Postman contract. Accept
// the names Fastrr's UI channel commonly returns and fall back to a nested
// `data` object, all without ever logging the value.
function extractCheckoutToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  for (const source of [root, data]) {
    if (!source) continue;
    for (const field of [
      "token",
      "access_token",
      "checkout_token",
      "custom_checkout_token",
    ]) {
      const value = source[field];
      if (typeof value === "string" && value.trim().length >= 10) {
        return value.trim();
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("Forbidden.", 403);

  const limit = await rateLimitRequest(request, RATE_LIMITS.checkout);
  if (!limit.success) return rateLimitError(limit);

  const credentials = resolveShiprocketCheckoutEnvironment();
  if (!credentials.ok) {
    // Log the failing check name (and the colliding partner env-var name on a
    // collision) so the deployment can self-diagnose a 503. Only the reason —
    // never a secret value — is echoed to the client for support context.
    console.error(
      "[shiprocket-checkout] credentials not resolved",
      credentials.collidingSecret
        ? { reason: credentials.reason, collidingSecret: credentials.collidingSecret }
        : { reason: credentials.reason },
    );
    return NextResponse.json(
      {
        error: "Shiprocket Checkout is temporarily unavailable.",
        reason: credentials.reason,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { apiKey } = credentials;

  // Wrap the whole token-mint path so any throw (payload build, signature,
  // upstream fetch, response parse) becomes a diagnosable JSON 502 with a
  // log reference instead of a blank platform/edge 502.
  try {
    const parsed = shiprocketCheckoutSchema.safeParse(
      await readJsonBody(request),
    );
    if (!parsed.success) return apiError("Your cart could not be prepared.", 400);

    const { products } = await getCatalog();
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
    const redirectUrl = `${origin}/shiprocket/complete`;

    // Official Fastrr access-token body, proven correct against the upstream:
    // synthetic variant_id = `${productId}--sr-size--${base64url(size)}`. This
    // same shape is decoded by the checkout webhook via fromShiprocketVariantId,
    // so the order round-trips end-to-end. Manual AbortController —
    // AbortSignal.timeout crashed the Vercel process into a blank edge 502.
    const payload = {
      cart_data: {
        items: parsed.data.items.map((item) => ({
          variant_id: toShiprocketVariantId(item.productId, item.size),
          quantity: item.quantity,
        })),
      },
      redirect_url: redirectUrl,
      timestamp: new Date().toISOString(),
    };
    const bodyStr = JSON.stringify(payload);
    const signature = createShiprocketCheckoutSignature(bodyStr);
    if (!signature) {
      return internalApiError(
        "shiprocket-checkout-token",
        new Error("HMAC signature could not be produced."),
        "Shiprocket Checkout could not be started.",
        502,
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(
        `${SHIPROCKET_CHECKOUT_BASE_URL}/api/v1/access-token/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
            "X-Api-HMAC-SHA256": signature,
          },
          body: bodyStr,
          redirect: "manual",
          signal: controller.signal,
        },
      );
    } catch (error) {
      // Network abort/timeout/throw — diagnosable 502, never a blank one.
      return internalApiError(
        "shiprocket-checkout-token",
        error,
        "Shiprocket Checkout is not responding.",
        502,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await upstream.text();
    if (!upstream.ok) {
      // Error bodies are safe to log for diagnosis; no secrets are present in a
      // failure response. Truncate to keep logs bounded.
      console.error("[shiprocket-checkout] upstream rejected mint", {
        status: upstream.status,
        body: text.slice(0, 400),
      });
      return NextResponse.json(
        {
          error: "Shiprocket Checkout could not be started.",
          upstreamStatus: upstream.status,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    let parsedResponse: unknown = null;
    try {
      parsedResponse = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON success body — fall through; token extraction will fail below.
    }

    const token = extractCheckoutToken(parsedResponse);
    if (!token) {
      // Do not log the success body — it may contain a token in an unexpected
      // field. Log only the absence of a recognized token field.
      console.error("[shiprocket-checkout] upstream 200 missing token field", {
        status: upstream.status,
      });
      return internalApiError(
        "shiprocket-checkout-token",
        new Error("Upstream returned no checkout token."),
        "Shiprocket Checkout could not be started.",
        502,
      );
    }

    return NextResponse.json(
      { token, redirectUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[shiprocket-checkout] token mint threw", {
      stage: "caught-throw",
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    });
    return internalApiError(
      "shiprocket-checkout-token",
      error,
      "Shiprocket Checkout could not be started.",
      502,
    );
  }
}
