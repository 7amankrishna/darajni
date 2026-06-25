import type { Metadata } from "next";

import LegalPage from "@/components/screens/LegalPage";

export const metadata: Metadata = {
  title: "Terms of use",
};

export default function TermsPage() {
  return <LegalPage type="terms" />;
}
