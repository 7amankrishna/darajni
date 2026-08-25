import "server-only";

import { unstable_cache } from "next/cache";

import { siteConfig } from "@/config/site";
import { getShiprocketEnvironment } from "@/lib/config/server-env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";
const RESPONSE_LIMIT_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const TOKEN_CACHE_MS = 9 * 24 * 60 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

type OrderItemRow = {
  product_id: string;
  product_name_at_time: string;
  selected_size: string;
  quantity: number;
  price_at_time: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  email: string | null;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  payment_method: "cod" | "payu" | "razorpay" | "shiprocket";
  status: string;
  created_at: string;
  order_items: OrderItemRow[];
};

class ShiprocketSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShiprocketSyncError";
  }
}

function asSafeIdentifier(value: unknown) {
  const identifier = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{1,100}$/.test(identifier) ? identifier : null;
}

function asShiprocketReference(orderNumber: string) {
  const reference = orderNumber.replace(/\D/g, "");
  return reference.length > 0 && reference.length <= 20 ? reference : null;
}

function splitCustomerName(name: string) {
  const [first = "Customer", ...rest] = name.trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}

function getIndiaOrderDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) throw new ShiprocketSyncError("Invalid order date.");
  return `${year}-${month}-${day}`;
}

async function readJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > RESPONSE_LIMIT_BYTES) {
    throw new ShiprocketSyncError("Shiprocket response was too large.");
  }
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > RESPONSE_LIMIT_BYTES) {
    throw new ShiprocketSyncError("Shiprocket response was too large.");
  }
  if (!body) return {} as Record<string, unknown>;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new ShiprocketSyncError("Shiprocket returned an invalid response.");
  }
}

async function authenticate() {
  const environment = getShiprocketEnvironment();
  if (!environment) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  let response: Response;
  try {
    response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: environment.email,
        password: environment.password,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ShiprocketSyncError("Shiprocket authentication could not be reached.");
  }

  const data = await readJson(response);
  const token = typeof data.token === "string" ? data.token : null;
  if (!response.ok || !token || token.length > 4_096) {
    throw new ShiprocketSyncError(
      `Shiprocket authentication failed (HTTP ${response.status}).`,
    );
  }

  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_CACHE_MS };
  return token;
}

function buildOrderPayload(order: OrderRow) {
  const environment = getShiprocketEnvironment();
  const orderReference = asShiprocketReference(order.order_number);
  if (!environment || !orderReference || !order.order_items.length) {
    throw new ShiprocketSyncError("The Shiprocket order could not be prepared.");
  }
  const customer = splitCustomerName(order.customer_name);
  const phone = order.phone.replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) {
    throw new ShiprocketSyncError("The Shiprocket order has an invalid phone number.");
  }

  return {
    // A numeric, stable reference prevents duplicates without exposing the
    // customer-facing order number format to Shiprocket's stricter API.
    order_id: orderReference,
    order_date: getIndiaOrderDate(order.created_at),
    pickup_location: environment.pickupLocation,
    billing_customer_name: customer.first,
    billing_last_name: customer.last,
    billing_address: order.address,
    billing_address_2: order.landmark ?? "",
    billing_city: order.city,
    billing_pincode: order.pincode,
    billing_state: order.state,
    billing_country: "India",
    billing_email: order.email ?? "",
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: order.order_items.map((item) => ({
      name: item.product_name_at_time,
      sku: `DJ-${item.product_id.slice(0, 8)}-${item.selected_size
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 6) || "STD"}`,
      units: item.quantity,
      selling_price: Number(item.price_at_time),
      discount: 0,
    })),
    payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
    shipping_charges: Number(order.shipping_fee),
    giftwrap_charges: 0,
    // The checkout total is calculated on the server. Keeping it as the
    // declared subtotal preserves the exact COD/prepaid amount in Shiprocket.
    total_discount: Number(order.discount_amount),
    sub_total: Number(order.total),
    length: environment.parcel.lengthCm,
    breadth: environment.parcel.breadthCm,
    height: environment.parcel.heightCm,
    weight: environment.parcel.weightKg,
  };
}

async function createRemoteOrder(payload: ReturnType<typeof buildOrderPayload>) {
  let token = await authenticate();
  if (!token) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ShiprocketSyncError("Shiprocket order creation could not be reached.");
    }

    if (response.status === 401 && attempt === 0) {
      cachedToken = null;
      token = await authenticate();
      if (!token) return null;
      continue;
    }

    const data = await readJson(response);
    // Shiprocket's own error message (e.g. "Wrong Pickup location entered")
    // is generic and safe to retain; the payload itself is never stored.
    const remoteMessage =
      typeof data.message === "string" ? data.message.slice(0, 200) : "";
    if (!response.ok) {
      throw new ShiprocketSyncError(
        `Shiprocket rejected the order (HTTP ${response.status}${
          remoteMessage ? `: ${remoteMessage}` : ""
        }).`,
      );
    }
    const orderId = asSafeIdentifier(data.order_id);
    if (!orderId) {
      throw new ShiprocketSyncError(
        `Shiprocket did not return an order ID${
          remoteMessage ? ` (${remoteMessage})` : ""
        }.`,
      );
    }
    return {
      orderId,
      shipmentId: asSafeIdentifier(data.shipment_id),
    };
  }

  throw new ShiprocketSyncError("Shiprocket authentication could not be refreshed.");
}

function retryAt(attemptCount: number) {
  const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attemptCount, 10));
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

function failureMessage(error: unknown) {
  if (error instanceof ShiprocketSyncError) return error.message.slice(0, 300);
  return "Shiprocket synchronization failed.";
}

async function markFailed(orderId: string, attemptCount: number, error: unknown) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;
  await supabase
    .from("shiprocket_order_syncs")
    .update({
      status: "failed",
      last_error: failureMessage(error),
      next_retry_at: retryAt(attemptCount),
    })
    .eq("order_id", orderId)
    .eq("status", "syncing");
}

export async function syncShiprocketOrder(orderId: string) {
  if (!getShiprocketEnvironment()) return { status: "not-configured" as const };

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "unavailable" as const };

  const { data: claim, error: claimError } = await supabase.rpc(
    "claim_shiprocket_order_sync",
    { p_order_id: orderId },
  );
  if (claimError) {
    console.error("Shiprocket sync claim failed", claimError.message);
    return { status: "unavailable" as const };
  }
  const claimed = Array.isArray(claim) ? claim[0] : claim;
  if (!claimed) return { status: "already-handled" as const };
  const attemptCount = Number(claimed.attempt_count) || 1;

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, phone, address, city, state, pincode, landmark, email, discount_amount, shipping_fee, total, payment_method, status, created_at, order_items(product_id, product_name_at_time, selected_size, quantity, price_at_time)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    await markFailed(
      orderId,
      attemptCount,
      new ShiprocketSyncError("The local order could not be loaded."),
    );
    return { status: "failed" as const };
  }
  const order = data as unknown as OrderRow;
  if (order.status === "cancelled") {
    await supabase
      .from("shiprocket_order_syncs")
      .update({
        status: "skipped",
        last_error: "Order was cancelled before Shiprocket sync.",
      })
      .eq("order_id", orderId)
      .eq("status", "syncing");
    return { status: "skipped" as const };
  }

  try {
    const remote = await createRemoteOrder(buildOrderPayload(order));
    if (!remote) {
      throw new ShiprocketSyncError("Shiprocket configuration is unavailable.");
    }
    const { error: updateError } = await supabase
      .from("shiprocket_order_syncs")
      .update({
        status: "synced",
        shiprocket_order_id: remote.orderId,
        shipment_id: remote.shipmentId,
        synced_at: new Date().toISOString(),
        last_error: null,
        next_retry_at: null,
      })
      .eq("order_id", orderId)
      .eq("status", "syncing");
    if (updateError) throw updateError;
    return { status: "synced" as const };
  } catch (syncError) {
    // Do not log the Shiprocket response or checkout payload: both can contain
    // customer delivery data. The sanitized failure state is enough to retry.
    await markFailed(orderId, attemptCount, syncError);
    return { status: "failed" as const };
  }
}

export async function retryShiprocketOrderSyncs(limit = 25) {
  if (!getShiprocketEnvironment()) return { attempted: 0, synced: 0 };
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { attempted: 0, synced: 0 };

  const { data, error } = await supabase.rpc(
    "get_due_shiprocket_order_syncs",
    { p_limit: limit },
  );
  if (error) {
    console.error("Shiprocket retry list failed", error.message);
    return { attempted: 0, synced: 0 };
  }

  let synced = 0;
  for (const row of data ?? []) {
    const result = await syncShiprocketOrder(String(row.order_id));
    if (result.status === "synced") synced += 1;
  }
  return { attempted: data?.length ?? 0, synced };
}

type ServiceabilityCourierRow = {
  courier_name?: unknown;
  estimated_delivery_days?: unknown;
  etd?: unknown;
  cod?: unknown;
};

export type DeliveryEstimate =
  | {
      status: "serviceable";
      fastestDays: number;
      slowestDays: number;
      codAvailable: boolean;
      fastestCourier: string | null;
    }
  | { status: "not-serviceable" }
  | { status: "unavailable" };

function parseDeliveryDays(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) return Math.max(0, Number(match[0]));
  }
  return null;
}

function daysFromEtd(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  return diff >= 0 ? diff : 0;
}

// Cached per delivery pincode for a day: courier ETDs move slowly, so repeat
// lookups never touch the Shiprocket API again for the same pincode.
export const getDeliveryEstimateForPincode = unstable_cache(
  async (deliveryPincode: string): Promise<DeliveryEstimate> => {
    if (!/^\d{6}$/.test(deliveryPincode)) return { status: "unavailable" };

    const environment = getShiprocketEnvironment();
    if (!environment) return { status: "unavailable" };

    const pickupPostcode = siteConfig.postalCode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(pickupPostcode)) return { status: "unavailable" };

    try {
      let token = await authenticate();
      if (!token) return { status: "unavailable" };

      const query = new URLSearchParams({
        pickup_postcode: pickupPostcode,
        delivery_postcode: deliveryPincode,
        cod: "1",
        weight: String(environment.parcel.weightKg),
      });

      for (let attempt = 0; attempt < 2; attempt += 1) {
        let response: Response;
        try {
          response = await fetch(
            `${SHIPROCKET_BASE_URL}/courier/serviceability/?${query}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            },
          );
        } catch {
          return { status: "unavailable" };
        }

        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          token = await authenticate();
          if (!token) return { status: "unavailable" };
          continue;
        }

        const data = await readJson(response);
        if (!response.ok) return { status: "unavailable" };

        const payload = (data.data ?? {}) as Record<string, unknown>;
        const couriers = Array.isArray(payload.available_courier_companies)
          ? (payload.available_courier_companies as ServiceabilityCourierRow[])
          : [];

        if (!couriers.length) return { status: "not-serviceable" };

        const daysPerCourier = couriers.map((courier) => ({
          days:
            parseDeliveryDays(courier.estimated_delivery_days) ??
            daysFromEtd(courier.etd),
          name:
            typeof courier.courier_name === "string"
              ? courier.courier_name.slice(0, 60)
              : null,
          cod: Number(courier.cod) === 1,
        }));

        const knownDays = daysPerCourier
          .map((courier) => courier.days)
          .filter((days): days is number => days !== null);

        if (!knownDays.length) return { status: "unavailable" };

        const sortedDays = [...new Set(knownDays)].sort((a, b) => a - b);
        const fastestDays = sortedDays[0];
        const fastestCourier =
          daysPerCourier.find((courier) => courier.days === fastestDays)?.name ??
          null;

        return {
          status: "serviceable",
          fastestDays,
          slowestDays: sortedDays[sortedDays.length - 1],
          codAvailable: daysPerCourier.some((courier) => courier.cod),
          fastestCourier,
        };
      }

      return { status: "unavailable" };
    } catch {
      // Never leak Shiprocket internals to the storefront; the UI falls back
      // to the standard 7-12 day copy when the estimate cannot be verified.
      return { status: "unavailable" };
    }
  },
  ["shiprocket-delivery-estimate"],
  { revalidate: 60 * 60 * 24, tags: ["serviceability"] },
);

export type OrderDeliverabilityStatus =
  | "unverified"
  | "serviceable"
  | "cod_unavailable"
  | "not_serviceable";

export interface OrderDeliverability {
  status: OrderDeliverabilityStatus;
  days: number | null;
}

// Maps a cached pincode estimate onto the order-level verdict stored for the
// admin panel. A COD order on a prepaid-only lane is flagged separately so
// operations can call the customer before dispatch.
export async function assessOrderDeliverability(
  pincode: string,
  paymentMethod: string,
): Promise<OrderDeliverability> {
  const estimate = await getDeliveryEstimateForPincode(pincode);

  if (estimate.status === "not-serviceable") {
    return { status: "not_serviceable", days: null };
  }
  if (estimate.status === "unavailable") {
    return { status: "unverified", days: null };
  }

  const codBlocked = !estimate.codAvailable && paymentMethod === "cod";
  return {
    status: codBlocked ? "cod_unavailable" : "serviceable",
    days: estimate.fastestDays,
  };
}
