import "server-only";

import { requireAdminPage } from "@/lib/auth/admin";
import { mapHomepageSlide } from "@/lib/data/homepage-slides";
import { mapEventBanner } from "@/lib/data/events";
import { normalizeMediaUrl } from "@/lib/media-url";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  AdminDashboardData,
  AdminOrder,
  AdminPromoCode,
} from "@/types/admin";
import type { Category, Product, StoreSettings } from "@/types/commerce";

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
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    fabric: String(row.fabric),
    sizes: Array.isArray(row.size) ? row.size.map(String) : [],
    stock: Number(row.stock),
    price: Number(row.price),
    discount: Number(row.discount),
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    videoUrl: normalizeMediaUrl(row.video_url ? String(row.video_url) : null),
    category: mapCategory(categoryRow as Record<string, unknown>),
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrder(row: Record<string, unknown>): AdminOrder {
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    address: String(row.address),
    city: String(row.city),
    state: String(row.state),
    pincode: String(row.pincode),
    landmark: row.landmark ? String(row.landmark) : null,
    email: row.email ? String(row.email) : null,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount ?? 0),
    promoCode: row.promo_code ? String(row.promo_code) : null,
    shippingFee: Number(row.shipping_fee),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    paymentMethod: row.payment_method as AdminOrder["paymentMethod"],
    paymentStatus: row.payment_status as AdminOrder["paymentStatus"],
    status: row.status as AdminOrder["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items: items.map((item) => {
      const value = item as Record<string, unknown>;
      return {
        id: String(value.id),
        productId: String(value.product_id),
        productName: String(value.product_name_at_time),
        selectedSize: String(value.selected_size),
        quantity: Number(value.quantity),
        priceAtTime: Number(value.price_at_time),
        lineTotal: Number(value.line_total),
      };
    }),
  };
}

function mapPromo(row: Record<string, unknown>): AdminPromoCode {
  const redemptions = Array.isArray(row.promo_redemptions)
    ? row.promo_redemptions
    : [];
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    codeType: row.code_type as AdminPromoCode["codeType"],
    discountType: row.discount_type as AdminPromoCode["discountType"],
    discountValue: Number(row.discount_value),
    minimumSubtotal: Number(row.minimum_subtotal),
    maximumDiscount:
      row.maximum_discount === null || row.maximum_discount === undefined
        ? null
        : Number(row.maximum_discount),
    usageLimit:
      row.usage_limit === null || row.usage_limit === undefined
        ? null
        : Number(row.usage_limit),
    perPhoneLimit: Number(row.per_phone_limit),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    redemptionCount: redemptions.length,
    redeemedAmount: redemptions.reduce((sum, item) => {
      const value = item as Record<string, unknown>;
      return sum + Number(value.discount_amount ?? 0);
    }, 0),
  };
}

const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function isMissingRelationError(error: unknown) {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function startOfToday() {
  const indiaNow = new Date(Date.now() + INDIA_OFFSET_MS);
  indiaNow.setUTCHours(0, 0, 0, 0);
  return new Date(indiaNow.getTime() - INDIA_OFFSET_MS);
}

function startOfWeek() {
  const date = startOfToday();
  const indiaDate = new Date(date.getTime() + INDIA_OFFSET_MS);
  const day = indiaDate.getUTCDay();
  indiaDate.setUTCDate(indiaDate.getUTCDate() - (day === 0 ? 6 : day - 1));
  return new Date(indiaDate.getTime() - INDIA_OFFSET_MS);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  const [
    ordersResult,
    productsResult,
    categoriesResult,
    promosResult,
    homepageSlidesResult,
    settingsResult,
    dressesResult,
    commentsResult,
    eventBannersResult,
  ] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "*, order_items(id, product_id, product_name_at_time, selected_size, quantity, price_at_time, line_total)",
        )
        // An online-payment reservation is not an actionable customer order
        // until the gateway has confirmed it as paid.
        .or("payment_method.eq.cod,payment_status.eq.paid")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select(
          "*, categories(id, name, slug, is_system)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name, slug, is_system")
        .order("name"),
      supabase
        .from("promo_codes")
        .select(
          "*, promo_redemptions(id, discount_amount, redeemed_at)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("homepage_slides")
        .select(
          "id, title, eyebrow, description, image_url, video_url, link_url, cta_label, sort_order, starts_at, ends_at, is_active, created_at, updated_at",
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("settings")
        .select(
          "shipping_charge, cod_enabled, tax_rate, developer_support_number, designer_support_number",
        )
        .eq("id", true)
        .single(),
      supabase.from("requested_dresses").select("*").order("created_at", { ascending: false }),
      supabase.from("requested_dress_comments").select("*").order("created_at", { ascending: false }),
      supabase
        .from("event_banners")
        .select("id, title, image_url, link_url, sort_order, is_active, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  const promoTablesMissing = isMissingRelationError(promosResult.error);
  const homepageSlidesTableMissing = isMissingRelationError(
    homepageSlidesResult.error,
  );
  const error =
    ordersResult.error ||
    productsResult.error ||
    categoriesResult.error ||
    (!promoTablesMissing ? promosResult.error : null) ||
    (!homepageSlidesTableMissing ? homepageSlidesResult.error : null) ||
    settingsResult.error ||
    (eventBannersResult.error && !isMissingRelationError(eventBannersResult.error) ? eventBannersResult.error : null);
  if (error) throw new Error(error.message);

  const orders = (ordersResult.data ?? []).map((row) =>
    mapOrder(row as unknown as Record<string, unknown>),
  );
  const products = (productsResult.data ?? []).map((row) =>
    mapProduct(row as unknown as Record<string, unknown>),
  );
  const categories = (categoriesResult.data ?? []).map((row) =>
    mapCategory(row as Record<string, unknown>),
  );
  const promos = promoTablesMissing
    ? []
    : (promosResult.data ?? []).map((row) =>
        mapPromo(row as unknown as Record<string, unknown>),
      );
  const homepageSlides = homepageSlidesTableMissing
    ? []
    : (homepageSlidesResult.data ?? []).map((row) =>
        mapHomepageSlide(row as unknown as Record<string, unknown>),
      );
  const eventBannersTableMissing = isMissingRelationError(eventBannersResult.error);
  const eventBanners = eventBannersTableMissing
    ? []
    : (eventBannersResult.data ?? []).map((row) =>
        mapEventBanner(row as unknown as Record<string, unknown>),
      );
  const settingsRow = settingsResult.data;
  const settings: StoreSettings = {
    shippingCharge: Number(settingsRow.shipping_charge),
    codEnabled: Boolean(settingsRow.cod_enabled),
    taxRate: Number(settingsRow.tax_rate),
    developerSupportNumber: String(
      settingsRow.developer_support_number || "",
    ),
    designerSupportNumber: String(settingsRow.designer_support_number || ""),
  };

  const requestedDresses = (dressesResult?.data ?? []).map((row: any) => ({
    id: String(row.id),
    imageUrl: String(row.image_url),
    storagePath: String(row.storage_path),
    description: row.description ? String(row.description) : null,
    status: row.status,
    consentedAt: String(row.consented_at),
    createdAt: String(row.created_at),
    userId: row.user_id ? String(row.user_id) : null,
    userName: row.user_name ? String(row.user_name) : null,
    userEmail: row.user_email ? String(row.user_email) : null,
    userPhone: row.user_phone ? String(row.user_phone) : null,
  }));

  const dressComments = (commentsResult?.data ?? []).map((row: any) => ({
    id: String(row.id),
    requestedDressId: String(row.requested_dress_id),
    commentText: String(row.comment_text),
    status: row.status,
    createdAt: String(row.created_at),
  }));

  const today = startOfToday().getTime();
  const week = startOfWeek().getTime();
  const completed = orders.filter((order) => order.status !== "cancelled");
  const daily = completed.filter(
    (order) => new Date(order.createdAt).getTime() >= today,
  );
  const weekly = completed.filter(
    (order) => new Date(order.createdAt).getTime() >= week,
  );
  const productTotals = new Map<
    string,
    { productId: string; name: string; quantity: number; revenue: number }
  >();
  for (const order of completed) {
    for (const item of order.items) {
      const current = productTotals.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.lineTotal;
      productTotals.set(item.productId, current);
    }
  }

  return {
    orders,
    products,
    categories,
    promos,
    homepageSlides,
    eventBanners,
    settings,
    analytics: {
      dailyOrders: daily.length,
      weeklyOrders: weekly.length,
      dailyRevenue: daily.reduce((sum, order) => sum + order.total, 0),
      weeklyRevenue: weekly.reduce((sum, order) => sum + order.total, 0),
      activeOrders: orders.filter(
        (order) => !["delivered", "cancelled"].includes(order.status),
      ).length,
      lowStock: products
        .filter((product) => product.isActive && product.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10),
      topProducts: [...productTotals.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    },
    requestedDresses,
    dressComments,
  };
}

export async function getAdminOrder(orderId: string): Promise<AdminOrder | null> {
  await requireAdminPage();
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(id, product_id, product_name_at_time, selected_size, quantity, price_at_time, line_total)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as unknown as Record<string, unknown>);
}
