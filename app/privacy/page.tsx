import type { Metadata } from "next";

import LegalPage from "@/components/screens/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return <LegalPage type="privacy" />;
}
