import type { Metadata } from "next";

import { RequestedDressesSection } from "@/components/requested-dresses-section";
import { siteConfig } from "@/config/site";
import { getRequestedDresses } from "@/lib/data/requested-dresses";

export const metadata: Metadata = {
  title: "Request a Custom Reference Dress | DARAJNI Designer House",
  description:
    "Upload a reference dress image that you would like DARAJNI to create. Compressed client-side, displayed in our community gallery.",
  alternates: { canonical: "/requested-dresses" },
  openGraph: {
    title: "Request a Custom Reference Dress | DARAJNI Designer House",
    description:
      "Upload a reference dress image that you would like DARAJNI to create.",
    url: `${siteConfig.siteUrl}/requested-dresses`,
  },
};

export default async function RequestedDressesPage() {
  const requests = await getRequestedDresses();

  return (
    <main className="min-h-screen bg-[#F8F5F2] pt-6 pb-20">
      <div className="section-shell mb-8 text-center pt-8">
        <span className="eyebrow text-[#C8A97E]">Community Inspiration Studio</span>
        <h1 className="font-display mt-3 text-5xl leading-tight text-[#3A2E25] sm:text-6xl">
          Request a Custom Dress
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6F6255]">
          Share reference images of dress designs you love. Our master artisans in Bihar Sharif review community requests for future couture collections.
        </p>
      </div>

      <RequestedDressesSection initialRequests={requests} />
    </main>
  );
}
