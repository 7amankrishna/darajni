import { Providers } from "@/components/providers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getCatalog, getStoreSettings } from "@/lib/data/catalog";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [settings, catalog] = await Promise.all([getStoreSettings(), getCatalog()]);
  const supportNumber =
    settings.designerSupportNumber || settings.developerSupportNumber;
  const availableCategories = catalog.categories
    .filter((category) =>
      catalog.products.some((product) => product.category.id === category.id),
    )
    .map(({ name, slug }) => ({ name, slug }));
  const hasSaleProducts = catalog.products.some((product) => product.discount > 0);

  return (
    <Providers>
      <Navbar
        supportNumber={supportNumber}
        shippingCharge={settings.shippingCharge}
        codEnabled={settings.codEnabled}
        availableCategories={availableCategories}
        hasSaleProducts={hasSaleProducts}
      />
      {children}
      <Footer
        supportNumber={supportNumber}
        availableCategories={availableCategories}
      />
    </Providers>
  );
}
