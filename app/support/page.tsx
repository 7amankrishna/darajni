import { Code2, MessageCircle, Scissors } from "lucide-react";
import type { Metadata } from "next";

import { whatsappSupportLink } from "@/config/site";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Contact DARAJNI website support or the dress designer. WhatsApp is for support only, not ordering.",
};

export default async function Page() {
  const settings = await getStoreSettings();
  const contacts = [
    {
      title: "Contact Developer",
      subtitle: "Website issues",
      description:
        "Use this contact for checkout errors, payment-page problems, tracking issues or anything technically broken on the website.",
      number: settings.developerSupportNumber,
      message:
        "Hello, I need help with a technical issue on the DARAJNI website.",
      icon: Code2,
    },
    {
      title: "Contact Dress Designer",
      subtitle: "Size, fabric and customisation",
      description:
        "Use this contact for fit guidance, fabric questions and customisation support before or after placing an online order.",
      number: settings.designerSupportNumber,
      message:
        "Hello DARAJNI, I need support regarding size, fabric or customisation.",
      icon: Scissors,
    },
  ];

  return (
    <main className="min-h-[70vh] py-14 sm:py-20">
      <div className="section-shell max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-[#caaa70]" />
          <p className="eyebrow mt-5">We are here to help</p>
          <h1 className="font-display mt-4 text-5xl sm:text-6xl">
            Choose the right support.
          </h1>
          <p className="mt-5 text-sm leading-7 text-white/48">
            WhatsApp is provided for support only. Orders must be placed through
            the website cart and secure checkout.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {contacts.map((contact) => {
            const Icon = contact.icon;
            return (
              <article key={contact.title} className="glass-panel p-7 sm:p-9">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[#caaa70]/25 bg-[#caaa70]/8 text-[#dfc184]">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="eyebrow mt-7">{contact.subtitle}</p>
                <h2 className="font-display mt-3 text-4xl">{contact.title}</h2>
                <p className="mt-5 text-sm leading-7 text-white/50">
                  {contact.description}
                </p>
                <a
                  href={whatsappSupportLink(contact.number, contact.message)}
                  target={contact.number ? "_blank" : undefined}
                  rel="noreferrer"
                  className="primary-button mt-7 w-full"
                >
                  Open support chat
                </a>
                {!contact.number && (
                  <p className="mt-3 text-center text-xs text-amber-200/60">
                    WhatsApp is not configured; this opens email support.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
