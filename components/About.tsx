import BrandLogo from "./BrandLogo";

export default function About() {
  return (
    <section id="about" className="bg-[#0d0d0c] py-20 sm:py-28">
      <div className="section-shell grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="relative grid min-h-[430px] place-items-center overflow-hidden rounded-[1.5rem] border border-[#caaa70]/12 bg-[radial-gradient(circle_at_center,rgba(202,170,112,.16),transparent_55%),#080808] sm:min-h-[600px]">
          <div className="absolute inset-8 rounded-full border border-[#caaa70]/10" />
          <div className="absolute inset-16 rounded-full border border-[#caaa70]/8" />
          <BrandLogo className="h-64 w-64 border border-[#caaa70]/20 shadow-[0_0_80px_rgba(202,170,112,.14)] sm:h-96 sm:w-96" />
          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:inset-x-7 sm:bottom-7 sm:p-7">
            <p className="font-display text-2xl text-[#e6cb98] sm:text-3xl">
              Built locally. Designed to travel.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Based in Bihar Sharif 803111, serving customers throughout India.
            </p>
          </div>
        </div>

        <div>
          <p className="eyebrow">The beginning of our story</p>
          <h2 className="font-display mt-5 text-5xl leading-[0.95] sm:text-6xl">
            A new label with
            <span className="block italic text-[#d5b574]">care at its centre.</span>
          </h2>
          <p className="mt-7 text-base leading-8 text-white/58">
            DARAJNI is growing from Bihar Sharif with a simple promise: present every design
            honestly, communicate each step clearly and help customers choose occasion wear
            that feels like their own.
          </p>
          <p className="mt-5 text-base leading-8 text-white/58">
            Trust is built through clear prices, secure online checkout and
            useful order updates. You can shop without creating an account and
            track every order with its order ID and matching phone number.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {[
              ["Clear pricing", "The checkout price matches the product listing."],
              ["Guest checkout", "Place an order without creating an account."],
              ["Order tracking", "Follow fulfilment with your order ID and phone."],
              ["Nationwide support", "Delivery and product support across India."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                <p className="font-display text-xl text-[#dfc48e]">{title}</p>
                <p className="mt-2 text-xs leading-6 text-white/75">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
