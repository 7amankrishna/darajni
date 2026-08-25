import { MessageCircle, Ruler } from "lucide-react";
import type { Metadata } from "next";

import { MeasurementGuideFigure } from "@/components/measurement-guide-figure";
import { whatsappSupportLink } from "@/config/site";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Size Guide",
  description:
    "Find your perfect DARAJNI fit with measurement guidance, size chart and custom-size support.",
};

const sizeRows = [
  ["XS", "32", "26", "34", "14", "Custom"],
  ["S", "34", "28", "36", "14.5", "Custom"],
  ["M", "36", "30", "38", "15", "Custom"],
  ["L", "38", "32", "40", "15.5", "Custom"],
  ["XL", "40", "34", "42", "16", "Custom"],
  ["XXL", "42", "36", "44", "16.5", "Custom"],
  ["3XL", "44", "38", "46", "17", "Custom"],
  ["Custom", "As shared", "As shared", "As shared", "As shared", "As shared"],
];

export default async function Page() {
  const settings = await getStoreSettings();
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I need help taking my measurements.",
  );

  return (
    <main className="bg-[var(--blush)] py-14 sm:py-20">
      <div className="section-shell">
        <div className="mx-auto max-w-3xl text-center">
          <Ruler className="mx-auto h-10 w-10 text-accent" />
          <p className="eyebrow mt-5">Size guide</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-text-primary sm:text-6xl">
            Find your perfect fit
          </h1>
          <p className="mt-5 text-sm leading-7 text-text-secondary">
            Use this guide to measure at home. For help, our team can guide you
            on WhatsApp.
          </p>
        </div>

        <section className="mt-12 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <MeasurementGuideFigure />

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-7">
            <p className="eyebrow">Size chart</p>
            <div className="table-scroll mt-5">
              <table className="w-full min-w-[680px] text-left text-sm text-text-secondary">
                <thead className="bg-surface-alt text-xs uppercase text-text-secondary">
                  <tr>
                    {["Size", "Bust", "Waist", "Hip", "Shoulder", "Length"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sizeRows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, index) => (
                        <td key={`${row[0]}-${index}`} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <p className="eyebrow">How to measure</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Wear fitted clothes and stand straight in front of a mirror.",
              "Measure shoulder tip to shoulder tip across the back.",
              "Wrap the tape around the fullest bust, natural waist and fullest hip.",
              "Measure sleeve from shoulder point to desired sleeve end.",
              "Measure blouse or lehenga length from the starting point to the desired hem.",
            ].map((step, index) => (
              <article key={step} className="rounded-2xl border border-border bg-surface p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#241B12] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="mt-5 text-sm font-semibold leading-6 text-text-primary">
                  {step}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-border bg-[#241B12] p-7 text-white sm:p-9">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase text-[#D9B56B]">
                Custom-size explanation
              </p>
              <h2 className="font-display mt-3 text-4xl leading-none">
                Custom-size orders are prepared using your measurements.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                Our team may contact you to confirm details before processing,
                especially for blouse length, sleeve length, lehenga length and
                preferred fit.
              </p>
            </div>
            <a href={whatsappHref} className="whatsapp-button">
              <MessageCircle className="h-4 w-4" />
              Get measurement help on WhatsApp
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
