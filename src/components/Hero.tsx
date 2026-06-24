interface HeroProps {
  onExplore: () => void;
}

export default function Hero({ onExplore }: HeroProps) {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]"
    >
      {/* Background collage */}
      <div className="absolute inset-0 grid grid-cols-3 gap-0 opacity-25">
        <div
          className="bg-cover bg-center col-span-1"
          style={{ backgroundImage: `url(https://images.pexels.com/photos/37628619/pexels-photo-37628619.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=400)` }}
        />
        <div
          className="bg-cover bg-center col-span-1"
          style={{ backgroundImage: `url(https://images.pexels.com/photos/17559250/pexels-photo-17559250.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=400)` }}
        />
        <div
          className="bg-cover bg-center col-span-1"
          style={{ backgroundImage: `url(https://images.pexels.com/photos/38093981/pexels-photo-38093981.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=400)` }}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/80" />

      {/* Decorative gold lines */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/30 to-transparent -translate-y-20" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent translate-y-20" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Pre-title */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a96e]" />
          <span
            className="text-[#c9a96e] text-xs tracking-[0.5em] uppercase"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Exclusive Designer House
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a96e]" />
        </div>

        {/* Main Title */}
        <h1
          className="text-white text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-light leading-none tracking-[0.1em] mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          DARJANA
        </h1>

        {/* Tagline */}
        <p
          className="text-white/60 text-sm sm:text-base tracking-[0.3em] uppercase mb-12"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Where Elegance Meets Artistry
        </p>

        {/* Description */}
        <p
          className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-14 font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Handcrafted designer dresses for the woman who commands every room. 
          Bridal couture, festive wear & luxury gowns — delivered across India.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <button
            onClick={onExplore}
            className="group relative px-10 py-4 bg-gradient-to-r from-[#c9a96e] to-[#8B6914] text-white text-xs tracking-[0.3em] uppercase font-medium overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#c9a96e]/30 hover:-translate-y-0.5 cursor-pointer"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span className="relative z-10">Explore Collection</span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B6914] to-[#c9a96e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>

          <a
            href={`https://wa.me/919876543210?text=${encodeURIComponent("Hello Darjana! I'd like to know more about your designer collection.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-10 py-4 border border-[#c9a96e]/50 text-[#c9a96e] text-xs tracking-[0.3em] uppercase font-medium hover:bg-[#c9a96e]/10 hover:border-[#c9a96e] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </a>
        </div>

        {/* Stats */}
        <div className="mt-20 flex items-center justify-center gap-12 sm:gap-20">
          {[
            { num: "500+", label: "Designs Created" },
            { num: "12+", label: "Years of Craft" },
            { num: "Pan India", label: "Delivery" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className="text-[#c9a96e] text-2xl sm:text-3xl font-light mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {stat.num}
              </p>
              <p
                className="text-white/40 text-[10px] tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/30 text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Scroll
        </span>
        <div className="w-px h-10 bg-gradient-to-b from-[#c9a96e]/60 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
