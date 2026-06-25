import { siteConfig, whatsappLink } from "../config/site";

export default function WhatsAppFloat() {
  if (!siteConfig.whatsappNumber) return null;
  return (
    <a
      href={whatsappLink("Hello DARAJNI! I would like to enquire about your collection.")}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-xl text-white shadow-2xl transition hover:scale-105 sm:bottom-6 sm:right-6"
      aria-label="Chat with DARAJNI on WhatsApp"
    >
      <span aria-hidden="true">✆</span>
    </a>
  );
}
