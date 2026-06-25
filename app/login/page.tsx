import type { Metadata } from "next";
import { Suspense } from "react";

import AuthPage from "@/components/screens/AuthPage";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[70vh] place-items-center">
          <p className="eyebrow">Loading account…</p>
        </main>
      }
    >
      <AuthPage />
    </Suspense>
  );
}
