"use client";

import { useState } from "react";

import { isProductInformationUncertain } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

const tabs = [
  "Description",
  "Fabric & Care",
  "Size Guide",
  "Shipping & Exchange",
  "Reviews",
];

const sizeRows = [
  ["XS", "32", "26", "34", "Custom"],
  ["S", "34", "28", "36", "Custom"],
  ["M", "36", "30", "38", "Custom"],
  ["L", "38", "32", "40", "Custom"],
  ["XL", "40", "34", "42", "Custom"],
  ["XXL", "42", "36", "44", "Custom"],
  ["3XL", "44", "38", "46", "Custom"],
];

export function ProductInfoTabs({ product }: { product: Product }) {
  const [active, setActive] = useState(tabs[0]);
  const descriptionNeedsConfirmation = isProductInformationUncertain(
    product.description,
  );
  const fabricNeedsConfirmation = isProductInformationUncertain(product.fabric);

  return (
    <section className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-4 sm:p-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-extrabold uppercase ${
              active === tab
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#E9DCCB] text-[#6F6255]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 text-sm leading-7 text-[#5F5348]">
        {active === "Description" && (
          <div>
            <h3 className="font-display text-3xl leading-none text-[#171717]">
              About this design
            </h3>
            <p className="mt-4">
              {descriptionNeedsConfirmation
                ? "Ask DARAJNI support to confirm the exact material, included pieces and finish for this design before ordering."
                : product.description}
            </p>
          </div>
        )}

        {active === "Fabric & Care" && (
          <div>
            <h3 className="font-display text-3xl leading-none text-[#171717]">
              Fabric finish and care
            </h3>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F6E9DD] p-4">
                <dt className="text-xs font-extrabold uppercase text-[#B8893B]">
                  Fabric
                </dt>
                <dd className="mt-2">
                  {fabricNeedsConfirmation
                    ? "Contact DARAJNI for exact fabric confirmation."
                    : product.fabric}
                </dd>
              </div>
              <div className="rounded-xl bg-[#F6E9DD] p-4">
                <dt className="text-xs font-extrabold uppercase text-[#B8893B]">
                  Garment care
                </dt>
                <dd className="mt-2">
                  Confirm the garment-specific care instructions with support.
                </dd>
              </div>
            </dl>
          </div>
        )}

        {active === "Size Guide" && (
          <div>
            <h3 className="font-display text-3xl leading-none text-[#171717]">
              Standard reference chart
            </h3>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[#F6E9DD] text-[#6F6255]">
                  <tr>
                    {["Size", "Bust", "Waist", "Hip", "Length"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold uppercase">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9DCCB]">
                  {sizeRows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell) => (
                        <td key={cell} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Custom-size orders are prepared using your measurements. Our team
              may contact you to confirm details before processing.
            </p>
          </div>
        )}

        {active === "Shipping & Exchange" && (
          <div>
            <h3 className="font-display text-3xl leading-none text-[#171717]">
              Shipping and exchange
            </h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Pan-India delivery with tracking updates.",
                "Most deliveries are estimated within 7–12 calendar days.",
                "Exchange requests must be raised within seven days of delivery.",
                "Custom-size rules are explained on the return and exchange page.",
              ].map((item) => (
                <li key={item} className="rounded-xl bg-[#F6E9DD] p-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {active === "Reviews" && (
          <div>
            <h3 className="font-display text-3xl leading-none text-[#171717]">
              Reviews
            </h3>
            <p className="mt-4">
              No verified reviews yet. Buyer reviews and delivery photos will
              appear here after real customer feedback is received.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
