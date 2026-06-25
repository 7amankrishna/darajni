import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { Category, Product, StoreSettings } from "@/types/commerce";

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    isSystem: Boolean(row.is_system),
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  const relation = row.categories;
  const categoryRow = Array.isArray(relation) ? relation[0] : relation;
  const category = mapCategory(
    (categoryRow as Record<string, unknown> | null) ?? {
      id: row.category_id,
      name: "Collection",
      slug: "collection",
      is_system: false,
    },
  );

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    fabric: String(row.fabric),
    sizes: Array.isArray(row.size) ? row.size.map(String) : ["Custom"],
    stock: Number(row.stock),
    price: Number(row.price),
    discount: Number(row.discount),
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    category,
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const productColumns = `
  id,
  name,
  slug,
  description,
  fabric,
  size,
  stock,
  price,
  discount,
  images,
  category_id,
  is_featured,
  is_active,
  created_at,
  updated_at,
  categories!products_category_id_fkey (
    id,
    name,
    slug,
    is_system
  )
`;

export const getCatalog = unstable_cache(
  async (): Promise<{ products: Product[]; categories: Category[] }> => {
    const supabase = createPublicClient();
    if (!supabase) return { products: [], categories: [] };

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(productColumns)
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name, slug, is_system")
        .order("is_system", { ascending: false })
        .order("name", { ascending: true }),
    ]);

    if (productsResult.error) {
      console.error("Catalog products query failed", productsResult.error.message);
    }
    if (categoriesResult.error) {
      console.error("Catalog categories query failed", categoriesResult.error.message);
    }

    return {
      products: (productsResult.data ?? []).map((row) =>
        mapProduct(row as unknown as Record<string, unknown>),
      ),
      categories: (categoriesResult.data ?? []).map((row) =>
        mapCategory(row as Record<string, unknown>),
      ),
    };
  },
  ["storefront-catalog"],
  { revalidate: 300, tags: ["catalog"] },
);

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("products")
        .select(productColumns)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Product query failed", error.message);
        return null;
      }

      return data
        ? mapProduct(data as unknown as Record<string, unknown>)
        : null;
    },
    ["storefront-product", slug],
    { revalidate: 300, tags: ["catalog", `product:${slug}`] },
  )();
}

export const getStoreSettings = unstable_cache(
  async (): Promise<StoreSettings> => {
    const defaults: StoreSettings = {
      shippingCharge: 0,
      codEnabled: true,
      taxRate: 0,
      developerSupportNumber:
        process.env.NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP?.replace(/\D/g, "") ??
        "",
      designerSupportNumber:
        process.env.NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP?.replace(/\D/g, "") ??
        "",
    };
    const supabase = createPublicClient();
    if (!supabase) return defaults;

    const { data, error } = await supabase
      .from("settings")
      .select(
        "shipping_charge, cod_enabled, tax_rate, developer_support_number, designer_support_number",
      )
      .eq("id", true)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("Settings query failed", error.message);
      return defaults;
    }

    return {
      shippingCharge: Number(data.shipping_charge),
      codEnabled: Boolean(data.cod_enabled),
      taxRate: Number(data.tax_rate),
      developerSupportNumber:
        String(data.developer_support_number || "") ||
        defaults.developerSupportNumber,
      designerSupportNumber:
        String(data.designer_support_number || "") ||
        defaults.designerSupportNumber,
    };
  },
  ["storefront-settings"],
  { revalidate: 300, tags: ["settings"] },
);
