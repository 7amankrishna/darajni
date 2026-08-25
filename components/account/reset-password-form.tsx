"use client";

import { Check, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setError("Password recovery is temporarily unavailable.");
      return;
    }

    let active = true;
    const prepareSession = async () => {
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("This reset link is invalid or has expired.");
          return;
        }
      }

      const { data } = await client.auth.getSession();
      if (!active) return;
      if (data.session) setReady(true);
      else setError("This reset link is invalid or has expired.");
    };

    void prepareSession();
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (active && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setReady(true);
        setError("");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [searchParams]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("The password could not be updated. Request a new reset link and try again.");
      return;
    }
    setComplete(true);
  };

  return (
    <main className="bg-[var(--blush)] py-12 sm:py-16">
      <div className="section-shell mx-auto max-w-2xl">
        <section className="premium-card p-6 sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-alt text-accent">
            {complete ? <Check className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <p className="eyebrow mt-6">Customer account</p>
          <h1 className="font-display mt-3 text-5xl leading-none text-text-primary sm:text-6xl">
            {complete ? "Password updated" : "Choose a new password"}
          </h1>

          {complete ? (
            <div className="mt-7">
              <p className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm text-emerald-900">
                Your password has been changed successfully. You can now continue to your account.
              </p>
              <Link href="/login" className="primary-button mt-5 w-full">Continue to account</Link>
            </div>
          ) : ready ? (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="new-password" className="field-label">New password</label>
                <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" autoComplete="new-password" minLength={8} required autoFocus />
              </div>
              <div>
                <label htmlFor="confirm-password" className="field-label">Confirm new password</label>
                <input id="confirm-password" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="field" autoComplete="new-password" minLength={8} required />
              </div>
              {error && <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-800">{error}</p>}
              <button type="submit" disabled={busy} className="primary-button w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Updating password" : "Update password"}
              </button>
            </form>
          ) : error ? (
            <div className="mt-7">
              <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-800">{error}</p>
              <Link href="/forgot-password" className="primary-button mt-5 w-full">Request a new link</Link>
            </div>
          ) : (
            <p className="mt-7 flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
