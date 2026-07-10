import "server-only";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { CustomerProfileInput } from "@/lib/validation/account";
import type {
  CheckoutCustomer,
  CustomerAccountData,
  CustomerProfile,
  OrderSummary,
} from "@/types/commerce";

function fallbackName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const emailName = user.email?.split("@")[0]?.trim() || "";
  const candidate = metadataName || emailName || "Customer";
  return candidate.length >= 2 ? candidate : "Customer";
}

function mapCustomerProfile(row: Record<string, unknown>): CustomerProfile {
  return {
    id: String(row.id),
    email: String(row.email || ""),
    fullName: String(row.full_name || ""),
    phone: String(row.phone || ""),
    address: String(row.address || ""),
    city: String(row.city || ""),
    state: String(row.state || ""),
    pincode: String(row.pincode || ""),
    landmark: String(row.landmark || ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrder(row: Record<string, unknown>): OrderSummary {
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
    paymentMethod: row.payment_method as OrderSummary["paymentMethod"],
    paymentStatus: row.payment_status as OrderSummary["paymentStatus"],
    status: row.status as OrderSummary["status"],
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

export async function getCustomerUser(): Promise<User | null> {
  const authClient = await createSupabaseServerClient();
  if (!authClient) return null;

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function getOrCreateCustomerProfile(
  user: User,
): Promise<CustomerProfile | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data: existing, error: selectError } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("Customer profile query failed", selectError.message);
    return null;
  }

  if (existing) {
    return mapCustomerProfile(existing as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("customer_profiles")
    .insert({
      id: user.id,
      email: (user.email || "").toLowerCase(),
      full_name: fallbackName(user),
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error) console.error("Customer profile creation failed", error.message);
    return null;
  }

  return mapCustomerProfile(data as Record<string, unknown>);
}

export async function saveCustomerProfile(
  user: User,
  input: CustomerProfileInput,
): Promise<CustomerProfile | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("customer_profiles")
    .upsert(
      {
        id: user.id,
        email: (user.email || "").toLowerCase(),
        full_name: input.fullName,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        landmark: input.landmark,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    if (error) console.error("Customer profile save failed", error.message);
    return null;
  }

  return mapCustomerProfile(data as Record<string, unknown>);
}

export async function saveCheckoutProfileForUser(
  user: User,
  customer: CheckoutCustomer,
): Promise<CustomerProfile | null> {
  return saveCustomerProfile(user, {
    fullName: customer.customerName,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
    landmark: customer.landmark || "",
  });
}

export async function getCustomerOrders(
  user: User,
  profile?: CustomerProfile | null,
): Promise<OrderSummary[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const orderSelect = `
    id,
    order_number,
    customer_name,
    phone,
    address,
    city,
    state,
    pincode,
    landmark,
    email,
    subtotal,
    discount_amount,
    promo_code,
    shipping_fee,
    tax_amount,
    total,
    payment_method,
    payment_status,
    status,
    created_at,
    updated_at,
    order_items (
      id,
      product_id,
      product_name_at_time,
      selected_size,
      quantity,
      price_at_time,
      line_total
    )
  `;

  const customerOrders = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (customerOrders.error) {
    console.error("Customer order query failed", customerOrders.error.message);
    return [];
  }

  const email = (profile?.email || user.email || "").toLowerCase();
  const emailOrders = email
    ? await supabase
        .from("orders")
        .select(orderSelect)
        .is("customer_id", null)
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [], error: null };

  if (emailOrders.error) {
    console.error("Customer email-order query failed", emailOrders.error.message);
  }

  const seen = new Set<string>();
  return [...(customerOrders.data ?? []), ...(emailOrders.data ?? [])]
    .filter((row) => {
      const id = String((row as Record<string, unknown>).id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort(
      (left, right) =>
        new Date(String((right as Record<string, unknown>).created_at)).getTime() -
        new Date(String((left as Record<string, unknown>).created_at)).getTime(),
    )
    .map((row) => mapOrder(row as unknown as Record<string, unknown>));
}

export async function getCustomerAccountData(): Promise<CustomerAccountData> {
  const user = await getCustomerUser();
  if (!user) {
    return { user: null, profile: null, orders: [] };
  }

  const profile = await getOrCreateCustomerProfile(user);
  return {
    user: {
      id: user.id,
      email: user.email || "",
    },
    profile,
    orders: await getCustomerOrders(user, profile),
  };
}
