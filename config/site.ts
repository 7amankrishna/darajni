const configuredDesignerWhatsApp =
  process.env.NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP?.replace(/\D/g, "");
const configuredDeveloperWhatsApp =
  process.env.NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP?.replace(/\D/g, "");

export const siteConfig = {
  name: "DARAJNI Designer House",
  shortName: "DARAJNI",
  slogan: "Don't just wear clothes. Wear confidence.",
  description:
    "DARAJNI creates made-to-order Indian occasion wear in Bihar Sharif, Bihar, with custom sizing and Pan-India delivery.",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.darajni.in").replace(/\/$/, ""),
  whatsappNumber: configuredDesignerWhatsApp || "",
  designerSupportWhatsApp: configuredDesignerWhatsApp || "",
  developerSupportWhatsApp: configuredDeveloperWhatsApp || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "7amankrishna@gmail.com",
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

export function whatsappSupportLink(number: string, message: string) {
  const normalized = number.replace(/\D/g, "");
  if (!normalized) return `mailto:${siteConfig.email}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
