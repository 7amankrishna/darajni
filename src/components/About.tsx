export default function About() {
  return (
    <section id="about" className="bg-[#080808] py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image collage */}
          <div className="relative h-[600px]">
            <div className="absolute top-0 left-0 w-[65%] h-[70%] overflow-hidden border border-[#c9a96e]/20">
              <img
                src="https://images.pexels.com/photos/6234216/pexels-photo-6234216.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=500"
                alt="Darjana Craftsmanship"
                className="w-full h-full object-cover grayscale-[30%]"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-[55%] h-[60%] overflow-hidden border border-[#c9a96e]/20">
              <img
                src="https://images.pexels.com/photos/34326848/pexels-photo-34326848.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=450"
                alt="Darjana Elegance"
                className="w-full h-full object-cover grayscale-[30%]"
              />
            </div>
            {/* Gold accent box */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-[#c9a96e] to-[#8B6914] px-6 py-5 text-center shadow-2xl shadow-[#c9a96e]/30 z-10">
              <p
                className="text-white text-4xl font-light leading-none mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                12+
              </p>
              <p
                className="text-white/80 text-[9px] tracking-[0.3em] uppercase"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Years of Craft
              </p>
            </div>
          </div>

          {/* Text */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px w-10 bg-[#c9a96e]" />
              <span
                className="text-[#c9a96e] text-[10px] tracking-[0.5em] uppercase"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Our Story
              </span>
            </div>

            <h2
              className="text-white text-5xl sm:text-6xl font-light leading-tight mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Crafted with
              <br />
              <span className="italic text-[#c9a96e]">passion & soul</span>
            </h2>

            <p
              className="text-white/60 text-lg font-light leading-relaxed mb-6"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Darjana was born from a simple belief — that every woman deserves to wear something extraordinary. 
              What started as a small atelier has grown into a beloved designer label, known across India for its handcrafted excellence.
            </p>

            <p
              className="text-white/60 text-lg font-light leading-relaxed mb-10"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Each piece is individually designed, embroidered by skilled artisans, and finished with meticulous attention to detail. 
              From bridal lehengas to festive anarkalis — we create wearable art.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: "✦", title: "Handcrafted", desc: "Every stitch placed by skilled artisans" },
                { icon: "✦", title: "Custom Sizing", desc: "Made to your exact measurements" },
                { icon: "✦", title: "Pan India Delivery", desc: "Shipped to every corner of India" },
                { icon: "✦", title: "WhatsApp Orders", desc: "Simple, personal ordering process" },
              ].map((f) => (
                <div key={f.title} className="border border-white/8 p-4 hover:border-[#c9a96e]/30 transition-colors duration-300">
                  <span className="text-[#c9a96e] text-lg mb-2 block">{f.icon}</span>
                  <h4
                    className="text-white text-base font-medium mb-1"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {f.title}
                  </h4>
                  <p
                    className="text-white/40 text-[11px] leading-relaxed"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div className="border-t border-white/10 pt-8">
              <p
                className="text-white/40 text-[10px] tracking-[0.3em] uppercase mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                With love,
              </p>
              <p
                className="text-[#c9a96e] text-3xl italic font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Darjana
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
