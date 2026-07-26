"use client";

import {
  FolderPlus,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/product/product-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/config/site";
import type { Category, Product } from "@/types/commerce";

interface ProductDraft {
  name: string;
  slug: string;
  description: string;
  fabric: string;
  sizes: string;
  stock: string;
  price: string;
  discount: string;
  images: string[];
  categoryId: string;
  isFeatured: boolean;
  isActive: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function blankDraft(categoryId = ""): ProductDraft {
  return {
    name: "",
    slug: "",
    description: "",
    fabric: "",
    sizes: "Custom",
    stock: "0",
    price: "0",
    discount: "0",
    images: [],
    categoryId,
    isFeatured: false,
    isActive: true,
  };
}

function fromProduct(product: Product): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    fabric: product.fabric,
    sizes: product.sizes.join(", "),
    stock: String(product.stock),
    price: String(product.price),
    discount: String(product.discount),
    images: [...product.images],
    categoryId: product.category.id,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
  };
}

export function ProductManagement({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(
    blankDraft(categories[0]?.id),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const activeCount = useMemo(
    () => products.filter((product) => product.isActive).length,
    [products],
  );

  const createProduct = () => {
    setEditing(null);
    setDraft(blankDraft(categories[0]?.id));
    setImageUrl("");
    setOpen(true);
  };

  const editProduct = (product: Product) => {
    setEditing(product);
    setDraft(fromProduct(product));
    setImageUrl("");
    setOpen(true);
  };

  const setField = <K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { url?: string; error?: string };
    setUploading(false);
    if (!response.ok || !result.url) {
      toast.error(result.error || "Image upload failed.");
      return;
    }
    setField("images", [...draft.images, result.url]);
    toast.success("Image uploaded.");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim(),
      fabric: draft.fabric.trim(),
      sizes: [...new Set(draft.sizes.split(",").map((size) => size.trim()).filter(Boolean))],
      stock: Number(draft.stock),
      price: Number(draft.price),
      discount: Number(draft.discount),
      images: draft.images,
      categoryId: draft.categoryId,
      isFeatured: draft.isFeatured,
      isActive: draft.isActive,
    };
    const response = await fetch(
      editing ? `/api/admin/products/${editing.id}` : "/api/admin/products",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "The product could not be saved.");
      return;
    }
    toast.success(editing ? "Product updated." : "Product created.");
    setOpen(false);
    router.refresh();
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Permanently delete "${product.name}"?`)) return;
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(result.error || "The product could not be deleted.");
      return;
    }
    toast.success("Product deleted.");
    router.refresh();
  };

  const createCategory = () => {
    setCategoryName("");
    setCategorySlug("");
    setCategoryOpen(true);
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    setCategorySaving(true);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: categoryName.trim(),
        slug: categorySlug.trim(),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setCategorySaving(false);
    if (!response.ok) {
      toast.error(result.error || "The category could not be created.");
      return;
    }
    toast.success("Category created. It is ready to use for new products.");
    setCategoryOpen(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Product management</p>
          <h2 className="font-display mt-2 text-4xl">Catalog</h2>
          <p className="mt-3 text-sm text-text-secondary">
            {activeCount} active of {products.length} products
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={createCategory} className="secondary-button">
            <FolderPlus className="h-4 w-4" />
            Add category
          </button>
          <button type="button" onClick={createProduct} className="primary-button">
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="glass-panel flex h-full flex-col overflow-hidden">
            <div className="relative h-72 shrink-0 bg-black sm:h-80">
              <ProductImage
                src={product.images[0] || "/logo.webp"}
                alt={product.name}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <div className="absolute left-3 top-3 flex gap-2">
                <span
                  className={`status-pill ${
                    product.isActive
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-surface-alt text-text-secondary"
                  }`}
                >
                  {product.isActive ? "Active" : "Hidden"}
                </span>
                {product.isFeatured && (
                  <span className="status-pill bg-[#B8893B] text-black">
                    Featured
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="eyebrow !text-[0.58rem]">{product.category.name}</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl">{product.name}</h3>
                <p className="shrink-0 text-sm text-[#D9B56B]">
                  {formatPrice(product.price)}
                </p>
              </div>
              <p className="mt-3 text-xs text-text-secondary">
                Stock {product.stock} · Discount {product.discount}% ·{" "}
                {product.sizes.join(", ")}
              </p>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => editProduct(product)}
                  className="secondary-button !px-3"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void remove(product)}
                  className="danger-button !px-3"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Product photos are stored only in the Supabase product-images bucket.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="product-name" className="field-label">
                Name
              </label>
              <input
                id="product-name"
                value={draft.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    name,
                    slug: editing ? current.slug : slugify(name),
                  }));
                }}
                className="field"
                minLength={2}
                maxLength={140}
                required
              />
            </div>
            <div>
              <label htmlFor="product-slug" className="field-label">
                Slug
              </label>
              <input
                id="product-slug"
                value={draft.slug}
                onChange={(event) => setField("slug", slugify(event.target.value))}
                className="field"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </div>
            <div>
              <label htmlFor="product-category" className="field-label">
                Category
              </label>
              <select
                id="product-category"
                value={draft.categoryId}
                onChange={(event) => setField("categoryId", event.target.value)}
                className="field"
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="product-fabric" className="field-label">
                Fabric
              </label>
              <input
                id="product-fabric"
                value={draft.fabric}
                onChange={(event) => setField("fabric", event.target.value)}
                className="field"
                placeholder="Exact fabric, e.g. silk blend with cotton lining"
                required
              />
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                Use confirmed material names. Avoid “appears,” “style,” “or” and other uncertain wording.
              </p>
            </div>
            <div>
              <label htmlFor="product-sizes" className="field-label">
                Sizes, comma separated
              </label>
              <input
                id="product-sizes"
                value={draft.sizes}
                onChange={(event) => setField("sizes", event.target.value)}
                className="field"
                placeholder="S, M, L, Custom"
                required
              />
            </div>
            <div>
              <label htmlFor="product-price" className="field-label">
                Price
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) => setField("price", event.target.value)}
                className="field"
                required
              />
            </div>
            <div>
              <label htmlFor="product-discount" className="field-label">
                Discount %
              </label>
              <input
                id="product-discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={draft.discount}
                onChange={(event) => setField("discount", event.target.value)}
                className="field"
                required
              />
            </div>
            <div>
              <label htmlFor="product-stock" className="field-label">
                Stock
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={draft.stock}
                onChange={(event) => setField("stock", event.target.value)}
                className="field"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="product-description" className="field-label">
                Description
              </label>
              <textarea
                id="product-description"
                value={draft.description}
                onChange={(event) => setField("description", event.target.value)}
                className="field min-h-32 resize-y"
                minLength={30}
                maxLength={5000}
                required
              />
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                State the included pieces, lining, work, colour, garment length,
                care instructions and model measurements when known.
              </p>
            </div>
            <div className="sm:col-span-2">
              <span className="field-label">Images</span>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {draft.images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border bg-black"
                  >
                    <ProductImage src={image} alt="" sizes="120px" />
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          "images",
                          draft.images.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/75"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-[#B8893B]/35 text-center text-[#D9B56B] hover:bg-[#B8893B]/5">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span>
                      <ImagePlus className="mx-auto h-5 w-5" />
                      <span className="mt-2 block text-[0.62rem] uppercase tracking-wider">
                        Upload
                      </span>
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void uploadImage(event)}
                    className="sr-only"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className="field"
                  placeholder="Or add an existing HTTPS image URL"
                />
                <button
                  type="button"
                  className="secondary-button shrink-0"
                  onClick={() => {
                    if (!imageUrl.trim()) return;
                    setField("images", [...draft.images, imageUrl.trim()]);
                    setImageUrl("");
                  }}
                >
                  Add URL
                </button>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                className="accent-[#B8893B]"
              />
              Visible in storefront
            </label>
            <label className="flex items-center gap-3 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(event) => setField("isFeatured", event.target.checked)}
                className="accent-[#B8893B]"
              />
              <span>Featured product <strong className="text-[#C8A97E] font-normal">(Sets Homepage Hero background &amp; Showcase)</strong></span>
            </label>
            <button
              type="submit"
              disabled={saving || uploading || draft.images.length === 0}
              className="primary-button sm:col-span-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create product"
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>
              Categories appear in the product editor after they are saved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="grid gap-5">
            <div>
              <label htmlFor="category-name" className="field-label">
                Category name
              </label>
              <input
                id="category-name"
                value={categoryName}
                onChange={(event) => {
                  const name = event.target.value;
                  setCategoryName(name);
                  setCategorySlug(slugify(name));
                }}
                className="field"
                placeholder="e.g. Bridal lehengas"
                minLength={2}
                maxLength={60}
                required
              />
            </div>
            <div>
              <label htmlFor="category-slug" className="field-label">
                Category slug
              </label>
              <input
                id="category-slug"
                value={categorySlug}
                onChange={(event) => setCategorySlug(slugify(event.target.value))}
                className="field"
                placeholder="bridal-lehengas"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                This must be unique and is used in collection links.
              </p>
            </div>
            <button type="submit" disabled={categorySaving} className="primary-button">
              {categorySaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  Create category
                </>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
