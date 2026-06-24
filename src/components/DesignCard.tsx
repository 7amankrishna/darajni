import { useState } from "react";
import { Design } from "../types";
import { WHATSAPP_NUMBER } from "../data/designs";
import { useAdmin } from "../context/AdminContext";

interface DesignCardProps {
  design: Design;
  onView: (design: Design) => void;
  onEdit?: (design: Design) => void;
}

export default function DesignCard({ design, onView, onEdit }: DesignCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const { isAdminMode, deleteDesign } = useAdmin();

  const waMessage = encodeURIComponent(
    `Hello Darjana! 🌸\n\nI'm interested in ordering:\n*${design.name}*\nPrice: ${design.price}\nFabric: ${design.fabric}\n\nPlease share more details and availability.`
  );
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  return (
    <div
      className="group relative bg-[#111111] border border-white/5 hover:border-[#c9a96e]/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#c9a96e]/10 overflow-hidden cursor-pointer"
      onMouseEnter={() => { setHovered(true); if (design.images.length > 1) setImgIdx(1); }}
      onMouseLeave={() => { setHovered(false); setImgIdx(0); }}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[3/4]" onClick={() => onView(design)}>
        <img
          src={design.images[imgIdx]}
          alt={design.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-80"}`} />

        {/* Featured Badge */}
        {design.featured && (
          <div className="absolute top-4 left-4">
            <span
              className="bg-gradient-to-r from-[#c9a96e] to-[#8B6914] text-white text-[9px] tracking-[0.25em] uppercase px-3 py-1 font-medium"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Featured
            </span>
          </div>
        )}

        {/* Quick View Button */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onView(design); }}
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white text-xs tracking-[0.2em] uppercase px-6 py-3 hover:bg-[#c9a96e] hover:border-[#c9a96e] transition-all duration-300"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Quick View
          </button>
        </div>

        {/* Color dot indicator */}
        {design.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {design.images.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === imgIdx ? "bg-[#c9a96e] scale-125" : "bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        {/* Category tag */}
        <p
          className="text-[#c9a96e] text-[9px] tracking-[0.35em] uppercase mb-2"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {design.category}
        </p>

        {/* Name */}
        <h3
          className="text-white text-xl font-light leading-snug mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {design.name}
        </h3>

        {/* Fabric */}
        <p
          className="text-white/40 text-[10px] tracking-[0.15em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {design.fabric}
        </p>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <p
            className="text-[#c9a96e] text-xl font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {design.price}
          </p>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-[10px] tracking-[0.15em] uppercase px-4 py-2 hover:bg-[#25D366] hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order
          </a>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {design.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-white/30 text-[8px] tracking-[0.2em] uppercase border border-white/10 px-2 py-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Admin Controls */}
        {isAdminMode && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit && onEdit(design); }}
              className="flex-1 text-[10px] tracking-[0.15em] uppercase py-2 border border-[#c9a96e]/40 text-[#c9a96e] hover:bg-[#c9a96e]/10 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${design.name}"?`)) deleteDesign(design.id);
              }}
              className="flex-1 text-[10px] tracking-[0.15em] uppercase py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
