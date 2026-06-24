import { useState } from "react";
import { useAdmin } from "../context/AdminContext";

interface NavbarProps {
  onAdminClick: () => void;
  activeSection: string;
  onNavClick: (section: string) => void;
}

export default function Navbar({ onAdminClick, activeSection, onNavClick }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAdminMode } = useAdmin();

  const navLinks = [
    { label: "Home", id: "home" },
    { label: "Collection", id: "collection" },
    { label: "About", id: "about" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#c9a96e]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavClick("home")}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#8B6914] flex items-center justify-center shadow-lg shadow-[#c9a96e]/30">
              <span className="text-white font-serif text-lg font-bold">D</span>
            </div>
            <div>
              <h1
                className="text-white font-serif text-2xl tracking-[0.15em] leading-none"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                DARJANA
              </h1>
              <p className="text-[#c9a96e] text-[9px] tracking-[0.35em] uppercase font-light" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Designer House
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onNavClick(link.id)}
                className={`text-xs tracking-[0.2em] uppercase font-medium transition-colors duration-300 cursor-pointer ${
                  activeSection === link.id ? "text-[#c9a96e]" : "text-white/70 hover:text-[#c9a96e]"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={onAdminClick}
              className={`text-xs tracking-[0.2em] uppercase px-4 py-2 border transition-all duration-300 cursor-pointer ${
                isAdminMode
                  ? "border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/10"
                  : "border-white/20 text-white/40 hover:border-[#c9a96e]/50 hover:text-white/60"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {isAdminMode ? "✦ Admin" : "Admin"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white/80 hover:text-[#c9a96e] transition-colors p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-6 flex flex-col gap-1.5">
              <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-t border-[#c9a96e]/20 px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { onNavClick(link.id); setMenuOpen(false); }}
              className={`block w-full text-left text-xs tracking-[0.2em] uppercase font-medium py-2 transition-colors ${
                activeSection === link.id ? "text-[#c9a96e]" : "text-white/70"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => { onAdminClick(); setMenuOpen(false); }}
            className="block w-full text-left text-xs tracking-[0.2em] uppercase font-medium py-2 text-white/40"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Admin Panel
          </button>
        </div>
      )}
    </nav>
  );
}
