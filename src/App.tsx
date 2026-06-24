import { useState, useEffect } from "react";
import { AdminProvider } from "./context/AdminContext";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Collection from "./components/Collection";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import DesignModal from "./components/DesignModal";
import AdminPanel from "./components/AdminPanel";
import WhatsAppFloat from "./components/WhatsAppFloat";
import { Design } from "./types";

function AppInner() {
  const [activeSection, setActiveSection] = useState("home");
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);

  // Track active section on scroll
  useEffect(() => {
    const sections = ["home", "collection", "about", "contact"];
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.4 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleEditDesign = (design: Design) => {
    setEditingDesign(design);
    setAdminOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar
        onAdminClick={() => setAdminOpen(true)}
        activeSection={activeSection}
        onNavClick={scrollToSection}
      />

      <Hero onExplore={() => scrollToSection("collection")} />
      <Collection
        onViewDesign={setSelectedDesign}
        onEditDesign={handleEditDesign}
      />
      <About />
      <Contact />
      <Footer onNavClick={scrollToSection} />

      {/* Design Detail Modal */}
      <DesignModal
        design={selectedDesign}
        onClose={() => setSelectedDesign(null)}
      />

      {/* Admin Panel Drawer */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        editingDesign={editingDesign}
        onClearEdit={() => setEditingDesign(null)}
      />

      {/* Floating WhatsApp Button */}
      <WhatsAppFloat />
    </div>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <AppInner />
    </AdminProvider>
  );
}
