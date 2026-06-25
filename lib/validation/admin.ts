import { z } from "zod";

import type { OrderStatus } from "@/types/database";

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value.startsWith("/")) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Each image must be a secure URL.");

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(30).max(5000),
  fabric: z.string().trim().min(2).max(1000),
  sizes: z.array(z.string().trim().min(1).max(40)).min(1).max(20),
  stock: z.number().int().min(0).max(1_000_000),
  price: z.number().min(0).max(100_000_000),
  discount: z.number().min(0).max(100),
  images: z.array(imageUrlSchema).min(1).max(12),
  categoryId: z.string().uuid(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const orderStatusSchema = z.object({
  currentStatus: z.enum([
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  status: z.enum([
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
});

export function isAllowedOrderTransition(
  current: OrderStatus,
  next: OrderStatus,
) {
  return transitions[current].includes(next);
}

export const settingsInputSchema = z.object({
  shippingCharge: z.number().min(0).max(1_000_000),
  codEnabled: z.boolean(),
  taxRate: z.number().min(0).max(100),
  developerSupportNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{0,20}$/),
  designerSupportNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{0,20}$/),
});
