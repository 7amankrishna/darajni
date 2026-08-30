import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  rateLimitHeaders,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

export function apiError(
  error: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    },
  );
}

export function rateLimitError(result: RateLimitResult) {
  return apiError(
    "Too many requests. Please try again later.",
    429,
    rateLimitHeaders(result),
  );
}

// Postgres reports a bare `raise exception 'message'` from our functions with
// SQLSTATE P0001. Every such message in our RPCs is a curated, shopper-safe
// business rule (e.g. "Coupon or voucher code has expired"), so we can surface
// it verbatim instead of hiding the reason behind a generic error. Anything
// with a different SQLSTATE is an infrastructure fault and must stay masked.
export function pgBusinessRuleMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { code?: unknown; message?: unknown };
  if (record.code !== "P0001" || typeof record.message !== "string") {
    return null;
  }
  const message = record.message.trim();
  return message.length > 0 && message.length <= 200 ? message : null;
}

function safeLogDetail(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 500) };
  }
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; message?: unknown };
    return {
      code: typeof record.code === "string" ? record.code.slice(0, 100) : undefined,
      message:
        typeof record.message === "string"
          ? record.message.slice(0, 500)
          : "Non-error object",
    };
  }
  return { message: String(error).slice(0, 500) };
}

export function internalApiError(
  context: string,
  error: unknown,
  publicMessage = "The request could not be completed right now.",
  status = 500,
) {
  const reference = randomUUID();
  console.error(`[${context}]`, { reference, ...safeLogDetail(error) });
  return NextResponse.json(
    { error: publicMessage, reference },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
