import { siteConfig, whatsappLink } from "../config/site";

export default function Hero() {
  const enquiryLink = whatsappLink(
    "Hello Darjana! I would like help choosing an outfit from your collection.",
  );

  return (
    <section id="home" className="relative isolate min-h-[calc(100svh-74px)] overflow-hidden">
      <img
        src="https://images.pexels.com/photos/37628619/pexels-photo-37628619.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1800"
        alt="Indian occasion wear by Darjana Designer House"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[55%_25%]"
        fetchPriority="high"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,7,7,.97)_0%,rgba(7,7,7,.82)_45%,rgba(7,7,7,.36)_100%)] max-md:bg-[linear-gradient(0deg,rgba(7,7,7,.98)_0%,rgba(7,7,7,.72)_65%,rgba(7,7,7,.38)_100%)]" />

      <div className="section-shell flex min-h-[calc(100svh-74px)] items-end pb-14 pt-20 md:items-center md:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Crafted in Bihar Sharif · Delivered Pan India</p>
          <h1 className="font-display mt-6 text-[clamp(3.5rem,9vw,7.8rem)] font-medium leading-[0.82] tracking-[-0.035em]">
            Occasion wear,
            <span className="mt-2 block italic text-[#d8b879]">made personal.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-white/67 md:text-lg">
            Discover made-to-order lehengas, sarees, anarkalis and gowns with custom sizing,
            clear order guidance and delivery across India.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#collection" className="primary-button sm:min-w-48">
              Explore collection
            </a>
            <a
              href={enquiryLink}
              target={siteConfig.whatsappNumber ? "_blank" : undefined}
              rel="noreferrer"
              className="secondary-button sm:min-w-48"
            >
              {siteConfig.whatsappNumber ? "Chat on WhatsApp" : "View contact details"}
            </a>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-3 divide-x divide-white/12 border-y border-white/12 py-5">
            {[
              ["Made to order", "Thoughtful finishing"],
              ["Custom sizing", "Fit guidance included"],
              ["Pan India", "Delivery support"],
            ].map(([title, detail]) => (
              <div key={title} className="px-3 first:pl-0 sm:px-6">
                <p className="font-display text-lg text-[#e2c48b] sm:text-2xl">{title}</p>
                <p className="mt-1 hidden text-[0.68rem] text-white/38 sm:block">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
