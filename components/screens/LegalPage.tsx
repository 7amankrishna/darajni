import { siteConfig } from "@/config/site";

export default function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-[65vh] bg-white dark:bg-[#100D0B] py-14 sm:py-20">
      <article className="section-shell max-w-3xl rounded-2xl border border-[#E8E2DA] dark:border-[#3B3026] bg-white dark:bg-[#1B1612] p-6 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-9">
        <p className="eyebrow">DARAJNI Designer House</p>
        <h1 className="font-display mt-4 text-5xl leading-none text-[#1E1E1E] dark:text-[#F7EADB]">
          {privacy ? "Privacy policy" : "Terms of use"}
        </h1>
        <p className="mt-4 text-sm text-[#666666] dark:text-[#B8A898]">Effective July 21, 2026</p>
        <div className="mt-9 space-y-7 text-sm leading-8 text-[#666666] dark:text-[#B8A898]">
          {privacy ? (
            <>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
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
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
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
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  Public dress requests
                </h2>
                <p className="mt-2">
                  When you submit a reference dress, the compressed image and
                  optional note are intentionally published in the Requested
                  dresses section of our homepage. Do not upload a personal
                  photo, face, child, address or other private information. We
                  store the public-display consent recorded with the upload and
                  may remove content that violates our terms.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  Your choices
                </h2>
                <p className="mt-2">
                  To request access to or deletion of eligible order-related
                  personal data, or to request removal of a dress reference you
                  submitted, email {siteConfig.email} and include the public
                  image link where possible.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  Product information
                </h2>
                <p className="mt-2">
                  Displayed prices, discounts, shipping and tax are revalidated
                  during checkout. An order is accepted only after inventory
                  and payment method checks succeed.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
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
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  Acceptable use
                </h2>
                <p className="mt-2">
                  Do not attempt to access another user&apos;s account, disrupt
                  the service, upload malicious material or misuse the
                  brand&apos;s content.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  User-submitted dress references
                </h2>
                <p className="mt-2">
                  Dress-reference uploads are public. You must not upload a
                  personal image, a child, private information, unlawful or
                  harmful material, or content you do not own or have permission
                  to share. You are solely responsible for your upload, note,
                  permissions, and any consequences arising from your activity.
                </p>
                <p className="mt-2">
                  By submitting content, you confirm that you have the required
                  rights and grant DARAJNI a non-exclusive, worldwide,
                  royalty-free licence to host, compress, display and promote
                  that content on our services. You may request removal by
                  contacting us, but cached copies may take time to disappear.
                  We may remove any submission at our discretion.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  No production promise or endorsement
                </h2>
                <p className="mt-2">
                  A public request is inspiration only. It does not create an
                  order, quote, acceptance, endorsement, exclusivity promise or
                  obligation for DARAJNI to reproduce, sell or contact you about
                  the design. User-submitted content is provided by its uploader;
                  DARAJNI does not verify or endorse its ownership or accuracy.
                </p>
              </section>
              <section>
                <h2 className="font-display text-3xl text-[#1E1E1E] dark:text-[#F7EADB]">
                  Responsibility and limitation of liability
                </h2>
                <p className="mt-2">
                  You agree to use the service lawfully and are responsible for
                  claims, losses or expenses caused by your content or conduct.
                  To the fullest extent permitted by applicable law, DARAJNI is
                  not liable for user activity, user-submitted content, third-party
                  rights disputes, indirect losses, or reliance on a dress request.
                  Nothing in these terms excludes liability that cannot legally
                  be excluded under Indian law or your non-waivable consumer rights.
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
