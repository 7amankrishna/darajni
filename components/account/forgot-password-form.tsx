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
    <main className="min-h-[75vh] bg-[#FAF7F2] py-8 sm:py-16 dark:bg-[#100D0B] flex items-center justify-center">
      <div className="w-full max-w-md px-4 sm:px-6">
        <section className="premium-card rounded-3xl border border-[#E8E2DA] bg-[#FFFFFF] p-6 sm:p-9 shadow-[0_20px_60px_rgba(58,46,37,0.08)] dark:border-[#3B3026] dark:bg-[#1B1612]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F5EFEB] text-[#C8A97E] dark:bg-[#241D17]">
            <Mail className="h-5 w-5" />
          </div>
          <div className="text-center mt-4">
            <span className="eyebrow text-[#C8A97E]">Account Security</span>
            <h1 className="font-display mt-2 text-3xl font-light text-[#1E1E1E] sm:text-4xl dark:text-[#F7EADB]">
              Reset password
            </h1>
            <p className="mt-2 text-xs leading-5 text-[#666666] dark:text-[#B8A898]">
              Enter the email used for your DARAJNI account to receive a secure reset link.
            </p>
          </div>

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
