import { MessageCircle, Ruler } from "lucide-react";
import type { Metadata } from "next";

import { MeasurementFigure } from "@/components/product/measurement-figure";
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
    <main className="bg-[#FFF8EF] py-14 sm:py-20">
      <div className="section-shell">
        <div className="mx-auto max-w-3xl text-center">
          <Ruler className="mx-auto h-10 w-10 text-[#B8893B]" />
          <p className="eyebrow mt-5">Size guide</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Find your perfect fit
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6F6255]">
            Use this guide to measure at home. For help, our team can guide you
            on WhatsApp.
          </p>
        </div>

        <section className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <MeasurementFigure />

          <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-7">
            <p className="eyebrow">Size chart</p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm text-[#5F5348]">
                <thead className="bg-[#F6E9DD] text-xs uppercase text-[#6F6255]">
                  <tr>
                    {["Size", "Bust", "Waist", "Hip", "Shoulder", "Length"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9DCCB]">
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
              ["Prepare", "Use a soft tape and wear fitted clothing. Stand naturally with your feet together."],
              ["Shoulder", "Measure straight across your back from one shoulder edge to the other."],
              ["Bust, waist & hips", "Keep the tape level around each fullest point. It should touch without squeezing."],
              ["Sleeve & length", "Measure from the shoulder point to the cuff, then shoulder to your desired outfit hem."],
              ["Confirm", "Record in inches, measure every point twice, then confirm the values during ordering."],
            ].map(([title, step], index) => (
              <article key={step} className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#171717] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="font-display mt-5 text-2xl text-[#171717]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5F5348]">
                  {step}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-[#E9DCCB] bg-[#171717] p-7 text-white sm:p-9">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
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
