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

const RESPONSE_LIMIT_BYTES = 64 * 1024;
// Keep the upstream timeout comfortably inside the function maxDuration so a
// slow Shiprocket response returns our diagnosable 502 JSON instead of being
// killed by the platform (which would surface as an opaque "error code: 502").
const UPSTREAM_TIMEOUT_MS = 8_000;

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

    console.error("[shiprocket-checkout] minting token", {
      stage: "upstream-fetch",
      items: payload.cart_data.items.length,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    });

    const response = await fetch(
      `${SHIPROCKET_CHECKOUT_BASE_URL}/api/v1/access-token/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
          "X-Api-HMAC-SHA256": signature,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );
    const responseBody = await readResponse(response);
    const result = responseBody?.result as Record<string, unknown> | undefined;
    const token =
      (typeof responseBody?.token === "string" && responseBody.token) ||
      (typeof result?.token === "string" && result.token) ||
      null;

    console.error("[shiprocket-checkout] upstream responded", {
      stage: "upstream-responded",
      status: response.status,
      tokenPresent: Boolean(token),
    });

    if (!response.ok || !token || token.length > 8_192) {
      // Surface the upstream HTTP status and a truncated error body to the
      // server log so a 502 can be traced to a specific Shiprocket rejection
      // (bad key, bad signature, malformed payload). Only the status code —
      // never the upstream body — is echoed to the client.
      console.error("[shiprocket-checkout] upstream token endpoint rejected", {
        status: response.status,
        tokenPresent: Boolean(token),
        tokenTooLong: token ? token.length > 8_192 : false,
        body: responseBody ? JSON.stringify(responseBody).slice(0, 1000) : null,
      });
      return NextResponse.json(
        {
          error: "Shiprocket Checkout could not be started.",
          upstreamStatus: response.status,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Catches a throw anywhere in the mint path — including the upstream fetch
    // (AbortSignal timeout, DNS, TLS) — and returns a reference the user can
    // look up in Vercel logs. Without this, a throw surfaces as a blank edge
    // 502 with no way to find the cause.
    console.error("[shiprocket-checkout] token mint threw", {
      stage: "caught-throw",
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      // `aborted` flags the 8s upstream timeout specifically.
      aborted: error instanceof Error && error.name === "TimeoutError",
    });
    return internalApiError(
      "shiprocket-checkout-token",
      error,
      "Shiprocket Checkout could not be started.",
      502,
    );
  }
}
