import { useState, useEffect } from "react";
import { Design } from "../types";
import { WHATSAPP_NUMBER } from "../data/designs";

interface DesignModalProps {
  design: Design | null;
  onClose: () => void;
}

export default function DesignModal({ design, onClose }: DesignModalProps) {
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setActiveImg(0);
    if (design) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [design]);

  if (!design) return null;

  const waMessage = encodeURIComponent(
    `Hello Darjana! 🌸\n\nI'm interested in ordering:\n*${design.name}*\nPrice: ${design.price}\nFabric: ${design.fabric}\n\nPlease share more details and availability.`
  );
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#111111] border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
        >
          ✕
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Images */}
          <div className="bg-[#0a0a0a]">
            {/* Main Image */}
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={design.images[activeImg]}
                alt={design.name}
                className="w-full h-full object-cover transition-all duration-500"
              />
            </div>

            {/* Thumbnails */}
            {design.images.length > 1 && (
              <div className="flex gap-2 p-4">
                {design.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-20 overflow-hidden border-2 transition-all duration-300 ${
                      activeImg === i ? "border-[#c9a96e]" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-8 flex flex-col justify-center">
            {/* Category */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-[#c9a96e]" />
              <span
                className="text-[#c9a96e] text-[10px] tracking-[0.4em] uppercase"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {design.category}
              </span>
            </div>

            {/* Name */}
            <h2
              className="text-white text-4xl font-light leading-tight mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {design.name}
            </h2>

            {/* Fabric */}
            <p
              className="text-white/50 text-xs tracking-[0.15em] uppercase mb-6"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {design.fabric}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span
                className="text-[#c9a96e] text-4xl font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {design.price}
              </span>
              <span
                className="text-white/30 text-xs tracking-widest"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                onwards
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-[#c9a96e]/40 to-transparent mb-8" />

            {/* Description */}
            <p
              className="text-white/65 text-lg font-light leading-relaxed mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {design.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-10">
              {design.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[#c9a96e]/70 text-[9px] tracking-[0.25em] uppercase border border-[#c9a96e]/20 px-3 py-1"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 px-8 hover:bg-[#128C7E] transition-all duration-300 hover:shadow-2xl hover:shadow-[#25D366]/30 hover:-translate-y-0.5 mb-4"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-sm tracking-[0.2em] uppercase font-medium">Order via WhatsApp</span>
            </a>

            <p
              className="text-white/30 text-[10px] tracking-[0.15em] text-center"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              ✦ Custom sizing available · Pan India shipping
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
