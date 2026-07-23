import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";

import { getPayUEnvironment } from "@/lib/config/server-env";

export const runtime = "nodejs";

const HANDOFF_COOKIE = "payu_handoff";

type PayUFields = Record<string, string>;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function checkoutRedirect(request: Request, payment: string) {
  const url = new URL("/checkout", request.url);
  url.searchParams.set("payment", payment);
  return NextResponse.redirect(url, 303);
}

function readFields(value: string | undefined): PayUFields | null {
  if (!value || value.length > 6_000) return null;
  try {
    const candidate = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as unknown;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    const fields: PayUFields = {};
    for (const [key, fieldValue] of Object.entries(candidate)) {
      if (
        !/^[a-zA-Z0-9_]{1,40}$/.test(key) ||
        typeof fieldValue !== "string" ||
        fieldValue.length > 1_000
      ) {
        return null;
      }
      fields[key] = fieldValue;
    }
    return fields;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const environment = getPayUEnvironment();
  const fields = readFields(request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${HANDOFF_COOKIE}=`))
    ?.slice(HANDOFF_COOKIE.length + 1));

  if (
    !environment ||
    !fields ||
    fields.key !== environment.key ||
    !/^[a-f0-9]{128}$/i.test(fields.hash || "")
  ) {
    return checkoutRedirect(request, "verification-failed");
  }

  const inputs = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
    )
    .join("");
  const response = new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting to PayU</title></head><body><form id="payu" method="post" action="${escapeHtml(environment.actionUrl)}">${inputs}</form><p>Redirecting to secure payment…</p><script>document.getElementById('payu').submit();</script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
  response.cookies.set({
    name: HANDOFF_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/payments/payu",
  });
  return response;
}
