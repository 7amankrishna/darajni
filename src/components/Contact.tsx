import { siteConfig, whatsappLink } from "../config/site";

const enquiries = [
  ["Collection help", "Hello Darjana! Please help me choose from your collection."],
  ["Bridal enquiry", "Hello Darjana! I am looking for a bridal outfit and would like guidance."],
  ["Custom sizing", "Hello Darjana! I would like to discuss custom sizing for an outfit."],
];

export default function Contact() {
  return (
    <section id="contact" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="glass-panel overflow-hidden">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-[#caaa70] p-7 text-[#17120a] sm:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.22em]">Start a conversation</p>
              <h2 className="font-display mt-5 text-5xl leading-none sm:text-6xl">
                Let’s find your outfit.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-black/65">
                Tell us the occasion, preferred style, expected date and city. We’ll guide you
                through availability, sizing and the next steps.
              </p>
              <div className="mt-10 space-y-4 text-sm">
                <p><strong>Location:</strong> Bihar Sharif, Bihar {siteConfig.postalCode}</p>
                <p><strong>Delivery:</strong> Across India</p>
                <p><strong>Email:</strong> {siteConfig.email}</p>
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
              <p className="eyebrow">Choose an enquiry</p>
              <div className="mt-6 grid gap-3">
                {enquiries.map(([label, message]) => (
                  <a
                    key={label}
                    href={whatsappLink(message)}
                    target={siteConfig.whatsappNumber ? "_blank" : undefined}
                    rel="noreferrer"
                    className="group flex min-h-16 items-center justify-between rounded-xl border border-white/10 px-5 text-sm text-white/70 transition hover:border-[#caaa70]/55 hover:bg-[#caaa70]/5"
                  >
                    <span>{label}</span>
                    <span className="text-[#d8b879] transition group-hover:translate-x-1">→</span>
                  </a>
                ))}
              </div>
              {!siteConfig.whatsappNumber && (
                <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/8 p-4 text-xs leading-6 text-amber-100/70">
                  WhatsApp will activate after <code>VITE_WHATSAPP_NUMBER</code> is added in
                  Vercel. Until then, email us at{" "}
                  <a className="underline" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
