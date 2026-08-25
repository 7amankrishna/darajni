"use client";

import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Estimate =
  | {
      status: "serviceable";
      fastestDays: number;
      slowestDays: number;
      codAvailable: boolean;
      fastestCourier: string | null;
    }
  | { status: "not-serviceable" }
  | { status: "unavailable" };

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

function dateIn(days: number) {
  return dayFormatter.format(new Date(Date.now() + days * 86_400_000));
}

export function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pincode: string;
    estimate: Estimate;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = pincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/shiprocket/serviceability?pincode=${pin}`,
      );
      const data = (await response.json().catch(() => null)) as
        | { estimate?: Estimate }
        | null;

      if (!response.ok || !data?.estimate) {
        setResult({ pincode: pin, estimate: { status: "unavailable" } });
        return;
      }
      setResult({ pincode: pin, estimate: data.estimate });
    } catch {
      setResult({ pincode: pin, estimate: { status: "unavailable" } });
    } finally {
      setLoading(false);
    }
  }

  const estimate = result?.estimate;

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label
        htmlFor="delivery-pincode"
        className="text-xs font-extrabold uppercase tracking-[0.1em] text-text-secondary"
      >
        Check delivery at your pincode
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="delivery-pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="e.g. 110001"
          value={pincode}
          onChange={(event) =>
            setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={loading || pincode.length !== 6}
          className="secondary-button shrink-0 !min-h-0 px-5 py-2.5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {estimate && result && (
        <div
          aria-live="polite"
          className="mt-3 rounded-xl border border-border bg-surface-alt/50 p-3.5 text-sm leading-6"
        >
          {estimate.status === "serviceable" ? (
            <>
              <p className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Serviceable · {result.pincode}
              </p>
              <p className="mt-1.5 text-text-secondary">
                Delivery by{" "}
                <span className="font-bold text-text-primary">
                  {dateIn(Math.max(1, estimate.fastestDays))}
                  {estimate.slowestDays > estimate.fastestDays
                    ? ` – ${dateIn(estimate.slowestDays)}`
                    : ""}
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {estimate.codAvailable
                  ? "Cash on Delivery available for this pincode."
                  : "Prepaid orders only for this pincode."}
                {estimate.fastestCourier
                  ? ` Fastest option: ${estimate.fastestCourier}.`
                  : ""}
              </p>
            </>
          ) : estimate.status === "not-serviceable" ? (
            <p className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <span>
                <span className="font-semibold text-error">Not serviceable.</span>{" "}
                <span className="text-text-secondary">
                  We can&apos;t deliver to {result.pincode} right now —{" "}
                  <Link href="/support" className="underline hover:text-text-primary">
                    contact support
                  </Link>
                  .
                </span>
              </span>
            </p>
          ) : (
            <p className="text-text-secondary">
              Couldn&apos;t verify just now. Standard delivery remains 7–12 days
              Pan-India.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
