import Link from "next/link";
import Seo from "@/components/Seo";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[65vh] place-items-center px-4 text-center">
      <Seo title="Page not found" noIndex />
      <div>
        <p className="eyebrow">404</p>
        <h1 className="font-display mt-3 text-6xl">This page is not in the collection.</h1>
        <Link href="/" className="primary-button mt-8">Return home</Link>
      </div>
    </main>
  );
}
