"use client";

import { ArrowLeft, Loader2, Mail, Send } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) {
      setError("Password recovery is temporarily unavailable.");
      return;
    }

    setBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );
    setBusy(false);

    if (resetError) {
      setError("The reset email could not be sent. Please try again later.");
      return;
    }

    setSent(true);
  };

  return (
    <main className="bg-[#FFF8EF] py-12 sm:py-16">
      <div className="section-shell mx-auto max-w-2xl">
        <section className="premium-card p-6 sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F6E9DD] text-[#B8893B]">
            <Mail className="h-5 w-5" />
          </div>
          <p className="eyebrow mt-6">Customer account</p>
          <h1 className="font-display mt-3 text-5xl leading-none text-[#171717] sm:text-6xl">
            Reset your password
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-[#6F6255]">
            Enter the email used for your DARAJNI account. We will send you a
            secure link to choose a new password.
          </p>

          {sent ? (
            <div className="mt-7">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm leading-6 text-emerald-900">
                If an account exists for <strong>{email}</strong>, a password
                reset link is on its way. Check your inbox and spam folder.
              </div>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="secondary-button mt-5 w-full"
              >
                Send another link
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="recovery-email" className="field-label">
                  Email
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
              {error && (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-800">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="primary-button w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {busy ? "Sending link" : "Send reset link"}
              </button>
            </form>
          )}

          <Link href="/login" className="secondary-button mt-5 w-full">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
