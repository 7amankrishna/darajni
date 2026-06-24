import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MAX_IMAGE_SOURCE_BYTES,
  optimizeImage,
  OptimizedImage,
} from "../lib/imageCompression";
import { supabase } from "../lib/supabase";
import { Category, Design } from "../types";

type DesignDraft = Omit<Design, "id" | "createdAt" | "updatedAt">;

interface CatalogContextValue {
  designs: Design[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  createDesign: (draft: DesignDraft) => Promise<string | null>;
  updateDesign: (id: string, draft: DesignDraft) => Promise<string | null>;
  deleteDesign: (id: string) => Promise<string | null>;
  createCategory: (name: string) => Promise<string | null>;
  deleteCategory: (id: string) => Promise<string | null>;
  uploadImage: (
    file: File,
  ) => Promise<{ url?: string; error?: string; optimization?: OptimizedImage }>;
  refreshCatalog: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

function fromProductRow(row: Record<string, unknown>): Design {
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

function fromCategoryRow(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    isSystem: Boolean(row.is_system),
    createdAt: String(row.created_at),
  };
}

function toProductRow(draft: DesignDraft) {
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setDesigns([]);
      setCategories([]);
      setError("Supabase deployment configuration is required.");
      setLoading(false);
      return;
    }

    const [productResult, categoryResult] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name, slug, is_system, created_at")
        .order("is_system", { ascending: false })
        .order("name", { ascending: true }),
    ]);

    const queryError = productResult.error || categoryResult.error;
    if (queryError) {
      setError(queryError.message);
      setDesigns([]);
      setCategories([]);
    } else {
      setDesigns((productResult.data || []).map((row) => fromProductRow(row)));
      setCategories((categoryResult.data || []).map((row) => fromCategoryRow(row)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const createDesign = useCallback(
    async (draft: DesignDraft) => {
      if (!supabase) return "Supabase deployment configuration is required.";
      const { error: insertError } = await supabase.from("products").insert(toProductRow(draft));
      if (insertError) return insertError.message;
      await refreshCatalog();
      return null;
    },
    [refreshCatalog],
  );

  const updateDesign = useCallback(
    async (id: string, draft: DesignDraft) => {
      if (!supabase) return "Supabase deployment configuration is required.";
      const { error: updateError } = await supabase
        .from("products")
        .update(toProductRow(draft))
        .eq("id", id);
      if (updateError) return updateError.message;
      await refreshCatalog();
      return null;
    },
    [refreshCatalog],
  );

  const deleteDesign = useCallback(
    async (id: string) => {
      if (!supabase) return "Supabase deployment configuration is required.";
      const { error: deleteError } = await supabase.from("products").delete().eq("id", id);
      if (deleteError) return deleteError.message;
      await refreshCatalog();
      return null;
    },
    [refreshCatalog],
  );

  const createCategory = useCallback(
    async (name: string) => {
      if (!supabase) return "Supabase deployment configuration is required.";
      const normalizedName = name.trim();
      if (normalizedName.length < 2) return "Category name must be at least 2 characters.";
      const { error: insertError } = await supabase.from("categories").insert({
        name: normalizedName,
        slug: slugify(normalizedName),
        is_system: false,
      });
      if (insertError) return insertError.message;
      await refreshCatalog();
      return null;
    },
    [refreshCatalog],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!supabase) return "Supabase deployment configuration is required.";
      const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
      if (deleteError) return deleteError.message;
      await refreshCatalog();
      return null;
    },
    [refreshCatalog],
  );

  const uploadImage = useCallback(async (file: File) => {
    if (!supabase) return { error: "Supabase deployment configuration is required." };
    if (!file.type.startsWith("image/")) return { error: "Choose a valid image file." };
    if (file.size > MAX_IMAGE_SOURCE_BYTES) {
      return { error: "The original image must be smaller than 25 MB." };
    }

    let optimization: OptimizedImage;
    try {
      optimization = await optimizeImage(file);
    } catch (compressionError) {
      return {
        error:
          compressionError instanceof Error
            ? compressionError.message
            : "The image could not be optimized.",
      };
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[optimization.file.type] || "webp";
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, optimization.file, {
        cacheControl: "31536000",
        contentType: optimization.file.type,
        upsert: false,
      });
    if (uploadError) return { error: uploadError.message };
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return { url: data.publicUrl, optimization };
  }, []);

  const value = useMemo(
    () => ({
      designs,
      categories,
      loading,
      error,
      createDesign,
      updateDesign,
      deleteDesign,
      createCategory,
      deleteCategory,
      uploadImage,
      refreshCatalog,
    }),
    [
      categories,
      createCategory,
      createDesign,
      deleteCategory,
      deleteDesign,
      designs,
      error,
      loading,
      refreshCatalog,
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
