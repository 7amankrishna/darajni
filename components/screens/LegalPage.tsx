import { siteConfig } from "@/config/site";

export default function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-[65vh] bg-[#FFF8EF] py-14 sm:py-20">
      <article className="section-shell max-w-3xl rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-9">
        <p className="eyebrow">DARAJNI Designer House</p>
        <h1 className="font-display mt-4 text-5xl leading-none text-[#171717]">
          {privacy ? "Privacy policy" : "Terms of use"}
        </h1>
        <p className="mt-4 text-sm text-[#6F6255]">Effective June 24, 2026</p>
        <div className="mt-9 space-y-7 text-sm leading-8 text-[#5F5348]">
          {privacy ? (
            <>
              <section>
                <h2 className="font-display text-3xl text-[#171717]">
                  Information we collect
                </h2>
                <p className="mt-2">
                  We collect the name, phone number, delivery address and
                  optional email you provide during guest checkout. Payment
                  processing is handled through Razorpay when online payment is
                  selected, and order records are stored through Supabase.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#171717]">
                  How we use it
                </h2>
                <p className="mt-2">
                  We use this information to process payment, fulfil and track
                  the order, communicate about delivery, provide support and
                  protect checkout from misuse. We do not sell personal
                  information.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#171717]">
                  Your choices
                </h2>
                <p className="mt-2">
                  To request access to or deletion of eligible order-related
                  personal data, email {siteConfig.email}.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-3xl text-[#171717]">
                  Product information
                </h2>
                <p className="mt-2">
                  Displayed prices, discounts, shipping and tax are revalidated
                  during checkout. An order is accepted only after inventory
                  and payment method checks succeed.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#171717]">
                  Payments and fulfilment
                </h2>
                <p className="mt-2">
                  Online payments are confirmed only after signature
                  verification. Cash-on-delivery availability may change.
                  Delivery estimates are estimates and can be affected by
                  location, weather, carriers or customisation support.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#171717]">
                  Acceptable use
                </h2>
                <p className="mt-2">
                  Do not attempt to access another user&apos;s account, disrupt
                  the service, upload malicious material or misuse the
                  brand&apos;s content.
                </p>
              </section>
            </>
          )}
          <p>
            Questions may be sent to{" "}
            <a href={`mailto:${siteConfig.email}`} className="font-semibold text-[#6E0F1A] underline">
              {siteConfig.email}
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
