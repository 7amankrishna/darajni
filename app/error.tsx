"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#FFF8EF] px-4 text-center">
      <div className="max-w-lg">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="font-display mt-4 text-5xl text-[#171717]">
          The page could not be prepared.
        </h1>
        <p className="mt-5 text-sm leading-7 text-[#6F6255]">
          Please retry. If the problem continues, contact website support.
        </p>
        <Button className="mt-7" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
