import { siteConfig } from "@/config/site";

function PrivacyContent() {
  return (
    <>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          1. Information We Collect
        </h2>
        <p className="mt-2">
          We collect the name, phone number, delivery address and optional
          email you provide during guest checkout or your account profile.
          When you upload a dress reference, we store the image you choose,
          an optional note and the public-display consent recorded with the
          upload.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          2. How We Use Your Information
        </h2>
        <p className="mt-2">
          We use this information to process payment, fulfil and track the
          order, communicate about delivery, provide support, publish dress
          references that were submitted for public display and protect
          checkout from misuse. We do not sell personal information.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          3. Payments &amp; Service Providers
        </h2>
        <p className="mt-2">
          Payment processing is handled through Razorpay when online payment
          is selected; cash-on-delivery orders are settled with our courier
          partner at the time of delivery. Order records are stored through
          Supabase and delivery is supported by logistics partners. These
          providers process data only to deliver their service to DARAJNI.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          4. Public Dress References
        </h2>
        <p className="mt-2">
          When you submit a reference dress, the compressed image and optional
          note are intentionally published in the Requested dresses section of
          our homepage. Do not upload a personal photo, face, child, address
          or other private information. We store the public-display consent
          recorded with the upload and may remove content that violates our
          terms.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          5. Data Requests &amp; Deletion
        </h2>
        <p className="mt-2">
          To request access to or deletion of eligible order-related personal
          data, or to request removal of a dress reference or product review
          you submitted, email {siteConfig.email} and include the order ID or
          public image link where possible.
        </p>
      </section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          1. Agreement to Terms
        </h2>
        <p className="mt-2">
          By browsing darajni.in, creating an account or placing an order you
          agree to these terms. If you do not agree, please do not use the
          service. You must be able to form a binding contract under Indian
          law to place an order.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          2. Orders, Pricing &amp; Payment
        </h2>
        <p className="mt-2">
          Displayed prices, discounts, shipping and tax are revalidated during
          checkout. An order is accepted only after inventory and payment
          method checks succeed.
        </p>
        <p className="mt-2">
          Online payments are confirmed only after signature verification.
          Cash-on-delivery availability may change and is always shown before
          you pay.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          3. Production &amp; Delivery
        </h2>
        <p className="mt-2">
          Delivery estimates are estimates and can be affected by location,
          weather, carriers or customisation support. Custom-size orders begin
          processing once measurements and finishing details are confirmed by
          our team.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          4. User-Submitted Dress References
        </h2>
        <p className="mt-2">
          Dress-reference uploads are public. You must not upload a personal
          image, a child, private information, unlawful or harmful material,
          or content you do not own or have permission to share. You are
          solely responsible for your upload, note, permissions, and any
          consequences arising from your activity.
        </p>
        <p className="mt-2">
          By submitting content, you confirm that you have the required rights
          and grant DARAJNI a non-exclusive, worldwide, royalty-free licence
          to host, compress, display and promote that content on our services.
          You may request removal by contacting us, but cached copies may take
          time to disappear. We may remove any submission at our discretion.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          5. No Production Promise or Endorsement
        </h2>
        <p className="mt-2">
          A public request is inspiration only. It does not create an order,
          quote, acceptance, endorsement, exclusivity promise or obligation
          for DARAJNI to reproduce, sell or contact you about the design.
          User-submitted content is provided by its uploader; DARAJNI does not
          verify or endorse its ownership or accuracy.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          6. Intellectual Property &amp; Prohibited Use
        </h2>
        <p className="mt-2">
          The DARAJNI name, logo, photography, design descriptions and site
          content are owned by DARAJNI Designer House and may not be copied or
          reused commercially without written permission. Do not attempt to
          access another user&apos;s account, disrupt the service, upload
          malicious material or misuse the brand&apos;s content.
        </p>
      </section>
      <section>
        <h2 className="font-display text-3xl text-text-primary">
          7. Responsibility &amp; Limitation of Liability
        </h2>
        <p className="mt-2">
          You agree to use the service lawfully and are responsible for
          claims, losses or expenses caused by your content or conduct. To the
          fullest extent permitted by applicable law, DARAJNI is not liable
          for user activity, user-submitted content, third-party rights
          disputes, indirect losses, or reliance on a dress request. Nothing
          in these terms excludes liability that cannot legally be excluded
          under Indian law or your non-waivable consumer rights.
        </p>
      </section>
    </>
  );
}

export default function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-[65vh] bg-background py-14 sm:py-20">
      <article className="section-shell max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-luxe-sm)] sm:p-9">
        <p className="eyebrow">Legal &amp; Policy</p>
        <h1 className="font-display mt-4 text-5xl leading-none text-text-primary">
          {privacy ? "Privacy Policy" : "Terms & Conditions"}
        </h1>
        <p className="mt-4 text-sm text-text-secondary">Effective July 21, 2026</p>
        <div className="mt-9 space-y-7 text-sm leading-8 text-text-secondary">
          {privacy ? <PrivacyContent /> : <TermsContent />}
          <p>
            Questions may be sent to{" "}
            <a href={`mailto:${siteConfig.email}`} className="font-semibold text-[var(--gold-dark)] underline">
              {siteConfig.email}
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
