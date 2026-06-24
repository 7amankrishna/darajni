import { useState, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { Design } from "../types";
import { categories } from "../data/designs";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  editingDesign?: Design | null;
  onClearEdit: () => void;
}

const emptyDesign: Omit<Design, "id"> = {
  name: "",
  category: "Lehenga",
  price: "",
  fabric: "",
  description: "",
  tags: [],
  images: [""],
  featured: false,
  available: true,
  color: "#c9a96e",
};

export default function AdminPanel({ isOpen, onClose, editingDesign, onClearEdit }: AdminPanelProps) {
  const { addDesign, updateDesign, isAdminMode, toggleAdminMode, adminPassword } = useAdmin();
  const [step, setStep] = useState<"auth" | "panel">(isAdminMode ? "panel" : "auth");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [form, setForm] = useState<Omit<Design, "id">>(emptyDesign);
  const [tagInput, setTagInput] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminMode) setStep("panel");
    else setStep("auth");
  }, [isAdminMode]);

  useEffect(() => {
    if (editingDesign) {
      setForm({
        name: editingDesign.name,
        category: editingDesign.category,
        price: editingDesign.price,
        fabric: editingDesign.fabric,
        description: editingDesign.description,
        tags: [...editingDesign.tags],
        images: [...editingDesign.images],
        featured: editingDesign.featured,
        available: editingDesign.available,
        color: editingDesign.color,
      });
      setIsEditing(true);
      setEditId(editingDesign.id);
    }
  }, [editingDesign]);

  if (!isOpen) return null;

  const handleAuth = () => {
    if (passwordInput === adminPassword) {
      setAuthError("");
      toggleAdminMode();
      setStep("panel");
    } else {
      setAuthError("Incorrect password. Please try again.");
    }
  };

  const handleField = (key: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }));
  };

  const addImageField = () => {
    setForm((prev) => ({ ...prev, images: [...prev.images, ""] }));
  };

  const updateImage = (idx: number, val: string) => {
    setForm((prev) => {
      const imgs = [...prev.images];
      imgs[idx] = val;
      return { ...prev, images: imgs };
    });
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.price || !form.fabric || !form.description) {
      setSuccessMsg("❌ Please fill all required fields.");
      return;
    }
    const cleanImages = form.images.filter((img) => img.trim() !== "");
    if (cleanImages.length === 0) {
      setSuccessMsg("❌ Please add at least one image URL.");
      return;
    }

    const finalDesign: Design = {
      id: editId ?? Date.now().toString(),
      ...form,
      images: cleanImages,
    };

    if (isEditing && editId) {
      updateDesign(finalDesign);
      setSuccessMsg("✅ Design updated successfully!");
    } else {
      addDesign(finalDesign);
      setSuccessMsg("✅ Design added to collection!");
    }

    setTimeout(() => {
      setForm(emptyDesign);
      setIsEditing(false);
      setEditId(null);
      setSuccessMsg("");
      onClearEdit();
    }, 1500);
  };

  const handleExit = () => {
    if (isAdminMode) toggleAdminMode();
    onClearEdit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-24">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleExit} />

      <div className="relative bg-[#111111] border border-white/10 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#111111] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3
              className="text-white text-xl font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {step === "auth" ? "Admin Access" : isEditing ? "Edit Design" : "Add New Design"}
            </h3>
            <p
              className="text-[#c9a96e] text-[9px] tracking-[0.3em] uppercase mt-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {step === "auth" ? "Restricted Area" : "Darjana Admin Panel"}
            </p>
          </div>
          <button
            onClick={handleExit}
            className="w-8 h-8 flex items-center justify-center border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Auth Step */}
        {step === "auth" && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#8B6914] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#c9a96e]/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p
                className="text-white/50 text-sm"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Enter the admin password to manage your collection
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="Admin Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm px-4 py-3 focus:outline-none focus:border-[#c9a96e]/50 transition-all"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
              {authError && (
                <p className="text-red-400 text-xs text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {authError}
                </p>
              )}
              <button
                onClick={handleAuth}
                className="w-full bg-gradient-to-r from-[#c9a96e] to-[#8B6914] text-white py-3 text-xs tracking-[0.3em] uppercase font-medium hover:shadow-lg hover:shadow-[#c9a96e]/30 transition-all"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Access Admin Panel
              </button>
              <p
                className="text-white/20 text-[9px] text-center tracking-widest"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Default password: darjana2024
              </p>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {step === "panel" && (
          <div className="p-6 space-y-6">
            {successMsg && (
              <div className={`p-3 text-sm text-center border ${successMsg.startsWith("✅") ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {successMsg}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="label-style">Design Name *</label>
              <input
                type="text"
                placeholder="e.g. Crimson Royale Lehenga"
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                className="input-style"
              />
            </div>

            {/* Category + Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-style">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => handleField("category", e.target.value)}
                  className="input-style"
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c} className="bg-[#111] text-white">{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-style">Price *</label>
                <input
                  type="text"
                  placeholder="₹12,500"
                  value={form.price}
                  onChange={(e) => handleField("price", e.target.value)}
                  className="input-style"
                />
              </div>
            </div>

            {/* Fabric */}
            <div>
              <label className="label-style">Fabric / Material *</label>
              <input
                type="text"
                placeholder="e.g. Pure Silk with Zari Work"
                value={form.fabric}
                onChange={(e) => handleField("fabric", e.target.value)}
                className="input-style"
              />
            </div>

            {/* Description */}
            <div>
              <label className="label-style">Description *</label>
              <textarea
                placeholder="Describe the design, embroidery, occasion, etc."
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
                rows={4}
                className="input-style resize-none"
              />
            </div>

            {/* Images */}
            <div>
              <label className="label-style">Image URLs *</label>
              <div className="space-y-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={img}
                      onChange={(e) => updateImage(idx, e.target.value)}
                      className="input-style flex-1"
                    />
                    {form.images.length > 1 && (
                      <button
                        onClick={() => removeImage(idx)}
                        className="px-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addImageField}
                  className="text-[#c9a96e] text-[10px] tracking-[0.2em] uppercase hover:text-[#c9a96e]/80 transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  + Add another image URL
                </button>
              </div>
              {form.images.some((img) => img.trim()) && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {form.images.filter((img) => img.trim()).map((img, i) => (
                    <div key={i} className="w-16 h-20 overflow-hidden border border-white/10">
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="label-style">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Bridal, Festive"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  className="input-style flex-1"
                />
                <button
                  onClick={addTag}
                  className="px-4 border border-[#c9a96e]/40 text-[#c9a96e] text-xs hover:bg-[#c9a96e]/10 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => removeTag(t)}
                    className="text-[#c9a96e]/70 text-[9px] tracking-[0.2em] uppercase border border-[#c9a96e]/20 px-2 py-1 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {t} ✕
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "featured", label: "Featured" },
                { key: "available", label: "Available" },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between border border-white/10 px-4 py-3"
                >
                  <span
                    className="text-white/60 text-xs tracking-[0.15em] uppercase"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {label}
                  </span>
                  <button
                    onClick={() => handleField(key as keyof typeof form, !form[key as keyof typeof form])}
                    className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
                      form[key as "featured" | "available"] ? "bg-[#c9a96e]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                        form[key as "featured" | "available"] ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-[#c9a96e] to-[#8B6914] text-white py-3.5 text-xs tracking-[0.3em] uppercase font-medium hover:shadow-lg hover:shadow-[#c9a96e]/30 transition-all"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {isEditing ? "Update Design" : "Add to Collection"}
              </button>
              {isEditing && (
                <button
                  onClick={() => { setForm(emptyDesign); setIsEditing(false); setEditId(null); onClearEdit(); }}
                  className="px-5 border border-white/20 text-white/50 text-xs tracking-[0.15em] uppercase hover:border-white/40 transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .label-style {
          display: block;
          color: rgba(255,255,255,0.4);
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          margin-bottom: 6px;
          font-family: 'Montserrat', sans-serif;
        }
        .input-style {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          font-size: 13px;
          padding: 10px 14px;
          outline: none;
          transition: border-color 0.3s;
          font-family: 'Montserrat', sans-serif;
        }
        .input-style::placeholder { color: rgba(255,255,255,0.2); }
        .input-style:focus { border-color: rgba(201,169,110,0.5); }
        select.input-style option { background: #111111; color: white; }
      `}</style>
    </div>
  );
}
