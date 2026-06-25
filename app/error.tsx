"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div className="max-w-lg">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="font-display mt-4 text-5xl">The page could not be prepared.</h1>
        <p className="mt-5 text-sm leading-7 text-white/50">
          Please retry. If the problem continues, contact website support.
        </p>
        <Button className="mt-7" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
