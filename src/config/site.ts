const configuredWhatsApp = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "");

export const siteConfig = {
  name: "DARAJNI Designer House",
  shortName: "DARAJNI",
  slogan: "Dont just wear Clothes. WEAR CONFIDENCE.",
  description:
    "DARAJNI creates made-to-order Indian occasion wear in Bihar Sharif, Bihar, with custom sizing and Pan-India delivery.",
  siteUrl: (import.meta.env.VITE_SITE_URL || "https://darajni.in").replace(/\/$/, ""),
  whatsappNumber: configuredWhatsApp || "",
  email: import.meta.env.VITE_CONTACT_EMAIL || "hello@darajni.in",
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
