const configuredWhatsApp = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "");

export const siteConfig = {
  name: "Darjana Designer House",
  shortName: "Darjana",
  description:
    "Made-to-order Indian occasion wear from Bihar Sharif, Bihar, with custom sizing and Pan-India delivery.",
  siteUrl: (import.meta.env.VITE_SITE_URL || "https://darjana.vercel.app").replace(/\/$/, ""),
  whatsappNumber: configuredWhatsApp || "",
  email: import.meta.env.VITE_CONTACT_EMAIL || "hello@darjana.in",
  locality: "Bihar Sharif",
  region: "Bihar",
  postalCode: "803111",
  country: "India",
};

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function whatsappLink(message: string) {
  if (!siteConfig.whatsappNumber) return "#contact";
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
