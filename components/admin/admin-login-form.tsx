"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase/client";

export function AdminLoginForm({ unauthorized = false }: { unauthorized?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setError("Administrator sign in is temporarily unavailable.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) {
      setBusy(false);
      setError("The email or password is incorrect.");
      return;
    }

    const response = await fetch("/api/admin/me", { cache: "no-store" });
    if (!response.ok) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("This account is not authorized for store administration.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  };

  return (
    <main className="admin-surface grid min-h-[calc(100svh-74px)] place-items-center px-4 py-12">
      <form onSubmit={submit} className="glass-panel w-full max-w-md p-7 sm:p-9">
        <BrandLogo className="mx-auto h-20 w-20 border border-[#B8893B]/25" priority />
        <div className="mt-6 text-center">
          <p className="eyebrow">Secure administration</p>
          <h1 className="font-display mt-3 text-4xl">Store sign in</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Only approved DARAJNI administrator accounts can continue.
          </p>
        </div>
        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor="admin-email" className="field-label">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="field-label">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>
        </div>
        {(error || unauthorized) && (
          <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-200">
            {error ||
              "This signed-in account is not authorized for store administration."}
          </p>
        )}
        <button type="submit" disabled={busy} className="primary-button mt-6 w-full">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <LockKeyhole className="h-4 w-4" />
              Sign in
            </>
          )}
        </button>
      </form>
    </main>
  );
}
