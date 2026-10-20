"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function NewsletterSignup() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), consent: data.get("consent") === "on" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't save your subscription. Please try again.");
      setMessage("You're on the list. Thank you for joining the DARAJNI circle.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="atelier-newsletter" onSubmit={subscribe}>
      <label htmlFor="newsletter-email">YOUR EMAIL ADDRESS</label>
      <div className="atelier-newsletter-field">
        <input id="newsletter-email" type="email" name="email" autoComplete="email" placeholder="A little inspiration in your inbox" required maxLength={254} />
        <button type="submit" disabled={pending} aria-label="Subscribe to DARAJNI updates">{pending ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}</button>
      </div>
      <label className="atelier-newsletter-consent"><input name="consent" type="checkbox" required /><span>I&apos;d like to receive DARAJNI collection updates by email. I can unsubscribe by contacting support. <Link href="/privacy" className="underline">Privacy policy</Link></span></label>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  );
}
