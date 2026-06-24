import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Seo from "../components/Seo";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { user, isAdmin, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const requestedPath = (location.state as { from?: string } | null)?.from;

  useEffect(() => setMessage(""), [mode]);

  if (user) {
    return <Navigate to={requestedPath || (isAdmin ? "/admin" : "/dashboard")} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(fullName, email, password);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
    } else if (result.message) {
      setMessage(result.message);
    }
  };

  return (
    <main className="grid min-h-[calc(100svh-74px)] place-items-center px-3 py-12">
      <Seo title={mode === "signin" ? "Sign in" : "Create account"} path="/login" noIndex />
      <div className="glass-panel w-full max-w-md p-6 sm:p-9">
        <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Join DARAJNI"}</p>
        <h1 className="font-display mt-3 text-4xl">
          {mode === "signin" ? "Sign in to your account" : "Create your customer account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/45">
          Track your reviews and see every moderation decision from your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="full-name" className="field-label">Full name</label>
              <input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="field"
                required
                minLength={2}
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="field-label">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          <button type="submit" disabled={busy} className="primary-button w-full">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          {message && (
            <p className="rounded-lg border border-[#caaa70]/20 bg-[#caaa70]/5 p-3 text-xs leading-5 text-[#e1c792]">
              {message}
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={() => setMode((value) => (value === "signin" ? "signup" : "signin"))}
          className="mt-6 w-full text-center text-sm text-white/48 hover:text-[#dfc184]"
        >
          {mode === "signin" ? "New here? Create an account" : "Already registered? Sign in"}
        </button>
      </div>
    </main>
  );
}
