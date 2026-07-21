"use client";

import { Loader2, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { OrderStatusTimeline } from "@/components/order/order-status-timeline";
import { formatDate } from "@/lib/commerce";
import type { TrackingResult } from "@/types/commerce";

export function TrackingForm() {
  const [orderReference, setOrderReference] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);

    const response = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderReference, phone }),
    });
    const body = (await response.json()) as {
      order?: TrackingResult;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !body.order) {
      setError(body.error || "The order could not be found.");
      return;
    }
    setResult(body.order);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-border bg-surface p-6 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tracking-id" className="field-label">
              Order ID
            </label>
            <input
              id="tracking-id"
              value={orderReference}
              onChange={(event) => setOrderReference(event.target.value)}
              className="field uppercase"
              placeholder="DJ-20260625-000001"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label htmlFor="tracking-phone" className="field-label">
              Phone number
            </label>
            <input
              id="tracking-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              required
            />
          </div>
        </div>
        {error && (
          <p className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="primary-button mt-6 w-full">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Track Order
            </>
          )}
        </button>
        <p className="mt-4 text-center text-xs text-text-secondary">
          Forgot your order ID?{" "}
          <Link href="/support" className="font-bold text-accent">
            Contact support
          </Link>
        </p>
      </form>

      {result && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Order found</p>
              <h2 className="font-display mt-2 text-4xl text-text-primary">
                {result.orderNumber}
              </h2>
            </div>
            <p className="text-xs font-semibold text-text-secondary">
              Last updated {formatDate(result.updatedAt)}
            </p>
          </div>
          <div className="mt-8">
            <OrderStatusTimeline status={result.status} />
          </div>
          <div className="mt-8 grid gap-4 rounded-2xl bg-surface-alt p-5 text-sm text-text-primary sm:grid-cols-3">
            <div>
              <p className="field-label">Placed</p>
              <p>{formatDate(result.createdAt)}</p>
            </div>
            <div>
              <p className="field-label">Current status</p>
              <p className="capitalize">{result.status}</p>
            </div>
            <Link href="/support" className="secondary-button">
              <MessageCircle className="h-4 w-4" />
              Support
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
