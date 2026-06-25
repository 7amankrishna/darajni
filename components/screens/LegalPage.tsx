import Seo from "@/components/Seo";
import { siteConfig } from "@/config/site";

export default function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-[65vh] py-14 sm:py-20">
      <Seo
        title={privacy ? "Privacy policy" : "Terms of use"}
        path={privacy ? "/privacy" : "/terms"}
      />
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
                  We collect account details you provide, including name, email, phone number
                  and delivery address, plus ratings and comments you submit. Authentication
                  and database records are processed through Supabase.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">How we use it</h2>
                <p className="mt-2">
                  We use this information to manage accounts, moderate reviews, respond to
                  enquiries, support delivery conversations, improve the collection and protect
                  the service from misuse. Administrators can view customer profile details for
                  these purposes. We do not sell personal information.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">Your choices</h2>
                <p className="mt-2">
                  You can delete your reviews from the customer dashboard. To request account
                  deletion or a copy of your data, email {siteConfig.email}.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-2xl text-white/80">Product information</h2>
                <p className="mt-2">
                  Displayed prices are starting prices. Final price, material, customisation,
                  production time, payment terms and delivery estimates must be confirmed
                  directly before an order is accepted.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">Reviews</h2>
                <p className="mt-2">
                  Reviews must reflect a genuine opinion and may not include abuse, spam,
                  private information or unlawful content. Moderators may approve, reject or
                  remove reviews. Rejection notes are shown privately to the reviewer. New
                  review submissions are rate-limited to protect the service from spam.
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl text-white/80">Account moderation</h2>
                <p className="mt-2">
                  DARAJNI may privately warn an account, disable review activity or block
                  account access when necessary to prevent abuse, spam or harm to other users.
                  A private explanation is shown to the affected user.
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
