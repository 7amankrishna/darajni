import { createContext, useContext, useState, ReactNode } from "react";
import { Design } from "../types";
import { designs as initialDesigns } from "../data/designs";

interface AdminContextType {
  designs: Design[];
  addDesign: (design: Design) => void;
  updateDesign: (design: Design) => void;
  deleteDesign: (id: string) => void;
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  adminPassword: string;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [designs, setDesigns] = useState<Design[]>(initialDesigns);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const adminPassword = "darjana2024"; // Simple frontend-only password

  const addDesign = (design: Design) => {
    setDesigns((prev) => [design, ...prev]);
  };

  const updateDesign = (design: Design) => {
    setDesigns((prev) => prev.map((d) => (d.id === design.id ? design : d)));
  };

  const deleteDesign = (id: string) => {
    setDesigns((prev) => prev.filter((d) => d.id !== id));
  };

  const toggleAdminMode = () => setIsAdminMode((prev) => !prev);

  return (
    <AdminContext.Provider
      value={{
        designs,
        addDesign,
        updateDesign,
        deleteDesign,
        isAdminMode,
        toggleAdminMode,
        adminPassword,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
