import { siteConfig } from "@/config/site";

export default function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-[65vh] py-14 sm:py-20">
      <article className="section-shell max-w-3xl">
        <p className="eyebrow">DARAJNI Designer House</p>
        <h1 className="font-display mt-4 text-5xl">{privacy ? "Privacy policy" : "Terms of use"}</h1>
        <p className="mt-4 text-sm text-white/38">Effective June 24, 2026</p>
        <div className="mt-9 space-y-7 text-sm leading-8 text-white/55">
          {privacy ? (
            <>
              <section>
                <h2 className="font-display text-2xl text-white/80">Information we collect</h2>
                <p className="mt-2">
                  We collect the name, phone number, delivery address and
                  optional email you provide during guest checkout. Payment
                  processing is handled through Razorpay when online payment is
                  selected, and order records are stored through Supabase.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">How we use it</h2>
                <p className="mt-2">
                  We use this information to process payment, fulfil and track
                  the order, communicate about delivery, provide support and
                  protect checkout from misuse. We do not sell personal
                  information.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">Your choices</h2>
                <p className="mt-2">
                  To request access to or deletion of eligible order-related
                  personal data, email {siteConfig.email}.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-2xl text-white/80">Product information</h2>
                <p className="mt-2">
                  Displayed prices, discounts, shipping and tax are revalidated
                  during checkout. An order is accepted only after inventory
                  and payment method checks succeed.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">Payments and fulfilment</h2>
                <p className="mt-2">
                  Online payments are confirmed only after signature
                  verification. Cash-on-delivery availability may change.
                  Delivery estimates are estimates and can be affected by
                  location, weather, carriers or customisation support.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">Acceptable use</h2>
                <p className="mt-2">
                  Do not attempt to access another user’s account, disrupt the service, upload
                  malicious material or misuse the brand’s content.
                </p>
              </section>
            </>
          )}
          <p>
            Questions may be sent to <a href={`mailto:${siteConfig.email}`} className="text-[#dfc184] underline">{siteConfig.email}</a>.
          </p>
        </div>
      </article>
    </main>
  );
}
