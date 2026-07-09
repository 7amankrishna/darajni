import { Providers } from "@/components/providers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getStoreSettings } from "@/lib/data/catalog";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;

  return (
    <Providers>
      <Navbar supportNumber={supportNumber} />
      {children}
      <Footer supportNumber={supportNumber} />
    </Providers>
  );
}
