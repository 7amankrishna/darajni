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
    // DIAGNOSTIC: probe several payload shapes in one request to find which
    // (if any) the Fastrr access-token endpoint accepts. Manual AbortController
    // (AbortSignal.timeout crashed the Vercel process -> blank edge 502).
    // No secrets logged — only upstream status + truncated body per shape.
    const baseItem = parsed.data.items[0];
    const firstProduct = requestedItems[0]?.product;
    const variants: Array<{ label: string; payload: unknown }> = [
      {
        label: "current-synthetic",
        payload: {
          cart_data: {
            items: parsed.data.items.map((item) => ({
              variant_id: toShiprocketVariantId(item.productId, item.size),
              quantity: item.quantity,
            })),
          },
          redirect_url: `${origin}/shiprocket/complete`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        label: "productId-only",
        payload: {
          cart_data: {
            items: parsed.data.items.map((item) => ({
              variant_id: item.productId,
              quantity: item.quantity,
            })),
          },
          redirect_url: `${origin}/shiprocket/complete`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        label: "full-details",
        payload: {
          cart_data: {
            items: parsed.data.items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return {
                variant_id: toShiprocketVariantId(item.productId, item.size),
                quantity: item.quantity,
                product_id: item.productId,
                selling_price: product ? String(product.price) : "0",
                name: product?.name ?? "",
                image: product?.images[0] ?? "",
              };
            }),
          },
          redirect_url: `${origin}/shiprocket/complete`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        label: "no-redirect-ts",
        payload: {
          cart_data: {
            items: parsed.data.items.map((item) => ({
              variant_id: toShiprocketVariantId(item.productId, item.size),
              quantity: item.quantity,
            })),
          },
        },
      },
      {
        label: "bare",
        payload: {
          cart_data: {
            items: [
              { variant_id: baseItem.productId, quantity: baseItem.quantity },
            ],
          },
        },
      },
    ];

    async function probe(
      label: string,
      payload: unknown,
    ): Promise<{ label: string; status: number; body: string }> {
      const bodyStr = JSON.stringify(payload);
      const sig = createShiprocketCheckoutSignature(bodyStr);
      if (!sig) return { label, status: -1, body: "no-signature" };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      try {
        const res = await fetch(
          `${SHIPROCKET_CHECKOUT_BASE_URL}/api/v1/access-token/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": apiKey,
              "X-Api-HMAC-SHA256": sig,
            },
            body: bodyStr,
            redirect: "manual",
            signal: controller.signal,
          },
        );
        const text = await res.text();
        return { label, status: res.status, body: text.slice(0, 400) };
      } catch (err) {
        return {
          label,
          status: -2,
          body: err instanceof Error ? err.name : "fetch-threw",
        };
      } finally {
        clearTimeout(timer);
      }
    }

    const results: Array<{ label: string; status: number; body: string }> = [];
    for (const v of variants) {
      results.push(await probe(v.label, v.payload));
      console.error("[shiprocket-checkout] probe", {
        label: v.label,
        status: results[results.length - 1].status,
      });
    }
    return NextResponse.json(
      { diagnostic: true, results, firstProductId: firstProduct?.id ?? null },
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
