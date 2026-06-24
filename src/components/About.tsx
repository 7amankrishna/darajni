export default function About() {
  return (
    <section id="about" className="bg-[#0d0d0c] py-20 sm:py-28">
      <div className="section-shell grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="relative min-h-[430px] overflow-hidden rounded-[1.5rem] sm:min-h-[600px]">
          <img
            src="https://images.pexels.com/photos/6234216/pexels-photo-6234216.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1100"
            alt="Detailed Indian textile and craftsmanship"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
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
            Darjana is growing from Bihar Sharif with a simple promise: present every design
            honestly, communicate each step clearly and help customers choose occasion wear
            that feels like their own.
          </p>
          <p className="mt-5 text-base leading-8 text-white/58">
            Because we are a new brand, trust matters more than inflated numbers. Product
            reviews are tied to customer accounts, published only after moderation, and every
            customer can see exactly whether their review is pending, approved or rejected.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {[
              ["Clear pricing", "Starting prices are shown before you enquire."],
              ["Custom fit", "Sizing conversations happen before production."],
              ["Review transparency", "Moderation status stays visible to the reviewer."],
              ["Nationwide support", "Order assistance for deliveries across India."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                <p className="font-display text-xl text-[#dfc48e]">{title}</p>
                <p className="mt-2 text-xs leading-6 text-white/42">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
