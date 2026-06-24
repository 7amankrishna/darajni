import { WHATSAPP_NUMBER } from "../data/designs";

export default function Contact() {
  const waLinks = [
    {
      label: "General Enquiry",
      message: "Hello Darjana! I have a general enquiry about your designer collection.",
    },
    {
      label: "Bridal Enquiry",
      message: "Hello Darjana! I'm looking for a bridal outfit. Can you help me with options and pricing?",
    },
    {
      label: "Custom Order",
      message: "Hello Darjana! I'd like to place a custom order. Please guide me through the process.",
    },
  ];

  return (
    <section id="contact" className="bg-[#0a0a0a] py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#c9a96e]" />
            <span
              className="text-[#c9a96e] text-[10px] tracking-[0.5em] uppercase"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Get in Touch
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#c9a96e]" />
          </div>
          <h2
            className="text-white text-5xl sm:text-6xl font-light mb-6"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Order via WhatsApp
          </h2>
          <p
            className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            No complicated forms. Just tap a button and start a conversation with us directly. 
            We're here to help you find your perfect outfit.
          </p>
        </div>

        {/* Main WhatsApp CTA */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-[#c9a96e]/20 p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>

            <h3
              className="text-white text-3xl font-light mb-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Chat with Darjana
            </h3>
            <p
              className="text-white/40 text-sm mb-8 leading-relaxed"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              We respond within a few hours. Ask us anything about sizing, availability, customisation, or delivery.
            </p>

            <div className="grid gap-3">
              {waLinks.map((link) => (
                <a
                  key={link.label}
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(link.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between px-6 py-4 border border-white/10 hover:border-[#25D366]/50 hover:bg-[#25D366]/5 transition-all duration-300"
                >
                  <span
                    className="text-white/70 text-sm group-hover:text-white transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {link.label}
                  </span>
                  <div className="flex items-center gap-2 text-[#25D366] text-[10px] tracking-[0.2em] uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Start Chat →
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            {
              icon: "📍",
              title: "Based in India",
              desc: "Designing from our atelier, shipping Pan India",
            },
            {
              icon: "⏱",
              title: "Quick Response",
              desc: "We typically reply within 2–4 hours on WhatsApp",
            },
            {
              icon: "🚚",
              title: "Pan India Delivery",
              desc: "We ship to every state & city across India",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="text-center border border-white/8 p-6 hover:border-[#c9a96e]/30 transition-colors duration-300"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h4
                className="text-white text-lg font-light mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {card.title}
              </h4>
              <p
                className="text-white/40 text-[11px] leading-relaxed"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
