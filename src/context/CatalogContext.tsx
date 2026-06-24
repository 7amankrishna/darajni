import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { designs as seedDesigns } from "../data/designs";
import { supabase } from "../lib/supabase";
import { Design } from "../types";

type DesignDraft = Omit<Design, "id" | "createdAt" | "updatedAt">;

interface CatalogContextValue {
  designs: Design[];
  loading: boolean;
  error: string | null;
  createDesign: (draft: DesignDraft) => Promise<string | null>;
  updateDesign: (id: string, draft: DesignDraft) => Promise<string | null>;
  deleteDesign: (id: string) => Promise<string | null>;
  uploadImage: (file: File) => Promise<{ url?: string; error?: string }>;
  refreshDesigns: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);
const DEMO_PRODUCTS_KEY = "darjana_demo_products";

function fromRow(row: Record<string, unknown>): Design {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    category: String(row.category),
    price: Number(row.price),
    fabric: String(row.fabric),
    description: String(row.description),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    featured: Boolean(row.featured),
    available: Boolean(row.available),
    color: String(row.color || "#c9a96e"),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function toRow(draft: DesignDraft) {
  return {
    name: draft.name,
    slug: draft.slug,
    category: draft.category,
    price: draft.price,
    fabric: draft.fabric,
    description: draft.description,
    tags: draft.tags,
    images: draft.images,
    featured: draft.featured,
    available: draft.available,
    color: draft.color,
  };
}

function readDemoProducts() {
  try {
    const saved = localStorage.getItem(DEMO_PRODUCTS_KEY);
    return saved ? (JSON.parse(saved) as Design[]) : seedDesigns;
  } catch {
    return seedDesigns;
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDesigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setDesigns(readDemoProducts());
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("products")
      .select("*")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setDesigns(seedDesigns);
    } else {
      setDesigns((data || []).map((row) => fromRow(row)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshDesigns();
  }, [refreshDesigns]);

  const persistDemo = (next: Design[]) => {
    setDesigns(next);
    localStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify(next));
  };

  const createDesign = useCallback(
    async (draft: DesignDraft) => {
      if (!supabase) {
        persistDemo([
          { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ...designs,
        ]);
        return null;
      }
      const { error: insertError } = await supabase.from("products").insert(toRow(draft));
      if (insertError) return insertError.message;
      await refreshDesigns();
      return null;
    },
    [designs, refreshDesigns],
  );

  const updateDesign = useCallback(
    async (id: string, draft: DesignDraft) => {
      if (!supabase) {
        persistDemo(
          designs.map((design) =>
            design.id === id
              ? { ...design, ...draft, updatedAt: new Date().toISOString() }
              : design,
          ),
        );
        return null;
      }
      const { error: updateError } = await supabase
        .from("products")
        .update(toRow(draft))
        .eq("id", id);
      if (updateError) return updateError.message;
      await refreshDesigns();
      return null;
    },
    [designs, refreshDesigns],
  );

  const deleteDesign = useCallback(
    async (id: string) => {
      if (!supabase) {
        persistDemo(designs.filter((design) => design.id !== id));
        return null;
      }
      const { error: deleteError } = await supabase.from("products").delete().eq("id", id);
      if (deleteError) return deleteError.message;
      await refreshDesigns();
      return null;
    },
    [designs, refreshDesigns],
  );

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return { error: "Choose a valid image file." };
    if (file.size > 5 * 1024 * 1024) return { error: "Image must be smaller than 5 MB." };

    if (!supabase) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read image."));
        reader.readAsDataURL(file);
      });
      return { url };
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) return { error: uploadError.message };
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return { url: data.publicUrl };
  }, []);

  const value = useMemo(
    () => ({
      designs,
      loading,
      error,
      createDesign,
      updateDesign,
      deleteDesign,
      uploadImage,
      refreshDesigns,
    }),
    [
      createDesign,
      deleteDesign,
      designs,
      error,
      loading,
      refreshDesigns,
      updateDesign,
      uploadImage,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used inside CatalogProvider");
  return context;
}
