import "server-only";

import { verifyOrderAccessToken } from "@/lib/security/order-token";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { OrderSummary } from "@/types/commerce";

export async function getOrderByAccessToken(
  token: string,
): Promise<OrderSummary | null> {
  const payload = verifyOrderAccessToken(token);
  if (!payload) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
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
      `,
    )
    .eq("id", payload.orderId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Order success query failed", error.message);
    return null;
  }

  return {
    id: String(data.id),
    orderNumber: String(data.order_number),
    customerName: String(data.customer_name),
    phone: String(data.phone),
    address: String(data.address),
    city: String(data.city),
    state: String(data.state),
    pincode: String(data.pincode),
    landmark: data.landmark ? String(data.landmark) : null,
    email: data.email ? String(data.email) : null,
    subtotal: Number(data.subtotal),
    shippingFee: Number(data.shipping_fee),
    taxAmount: Number(data.tax_amount),
    total: Number(data.total),
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    status: data.status,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
    items: (data.order_items ?? []).map((item) => ({
      id: String(item.id),
      productId: String(item.product_id),
      productName: String(item.product_name_at_time),
      selectedSize: String(item.selected_size),
      quantity: Number(item.quantity),
      priceAtTime: Number(item.price_at_time),
      lineTotal: Number(item.line_total),
    })),
  };
}
