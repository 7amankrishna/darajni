import { z } from "zod";

import type { OrderStatus } from "@/types/database";

export const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//")) return true;
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

export const promoInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .transform((value) => value.replace(/\s+/g, "").toUpperCase())
      .refine(
        (value) => /^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(value),
        "Code can use uppercase letters, numbers, underscores and hyphens.",
      ),
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().max(300).nullable().optional(),
    codeType: z.enum(["coupon", "voucher"]),
    discountType: z.enum(["percentage", "fixed_amount"]),
    discountValue: z.number().positive().max(100_000_000),
    minimumSubtotal: z.number().min(0).max(100_000_000),
    maximumDiscount: z.number().positive().max(100_000_000).nullable().optional(),
    usageLimit: z.number().int().positive().max(10_000_000).nullable().optional(),
    perPhoneLimit: z.number().int().min(1).max(100_000),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean(),
  })
  .refine(
    (value) =>
      value.discountType !== "percentage" || value.discountValue <= 100,
    "Percentage discounts cannot exceed 100%.",
  )
  .refine(
    (value) =>
      !value.startsAt ||
      !value.endsAt ||
      new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(),
    "Start date must be before end date.",
  );

const homepageLinkSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a site path beginning with / or a secure HTTPS URL.");

export const homepageSlideInputSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    eyebrow: z.string().trim().max(60).nullable().optional(),
    description: z.string().trim().max(320).nullable().optional(),
    imageUrl: imageUrlSchema,
    linkUrl: homepageLinkSchema,
    ctaLabel: z.string().trim().min(2).max(40),
    sortOrder: z.number().int().min(0).max(10_000),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean(),
  })
  .refine(
    (value) =>
      !value.startsAt ||
      !value.endsAt ||
      new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(),
    "Start date must be before end date.",
  );
