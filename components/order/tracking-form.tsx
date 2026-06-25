"use client";

import { Loader2, Search } from "lucide-react";
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
    <div className="mx-auto max-w-3xl">
      <form onSubmit={submit} className="glass-panel p-6 sm:p-8">
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
          <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-200">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="primary-button mt-6 w-full">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Track order
            </>
          )}
        </button>
      </form>

      {result && (
        <section className="glass-panel mt-6 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Order found</p>
              <h2 className="font-display mt-2 text-3xl">{result.orderNumber}</h2>
            </div>
            <p className="text-xs text-white/40">
              Last updated {formatDate(result.updatedAt)}
            </p>
          </div>
          <div className="mt-8">
            <OrderStatusTimeline status={result.status} />
          </div>
        </section>
      )}
    </div>
  );
}
