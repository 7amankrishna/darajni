import type { Metadata } from "next";

import { InteractiveMeasurementGuide } from "@/components/product/interactive-measurement-guide";

export const metadata: Metadata = {
  title: "Interactive Measurement Guide",
  description:
    "Enter, check and save the custom measurements used for your DARAJNI outfit.",
};

export default function Page() {
  return <InteractiveMeasurementGuide />;
}
