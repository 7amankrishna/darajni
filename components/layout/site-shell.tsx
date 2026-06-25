"use client";

import { Providers } from "@/components/providers";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import AccountNotice from "@/components/AccountNotice";
import ConfigurationRequired from "@/components/ConfigurationRequired";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export function SiteShell({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <ConfigurationRequired />;

  return (
    <Providers>
      <Navbar />
      <AccountNotice />
      {children}
      <Footer />
      <WhatsAppFloat />
    </Providers>
  );
}
