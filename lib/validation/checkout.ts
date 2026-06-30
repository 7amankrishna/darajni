import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.replace(/\D/g, "").slice(-10).length === 10,
    "Enter a valid 10-digit phone number.",
  );

export const checkoutSchema = z.object({
  customer: z.object({
    customerName: z.string().trim().min(2).max(100),
    phone: phoneSchema,
    address: z.string().trim().min(10).max(300),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/),
    landmark: z.string().trim().max(160).optional().default(""),
    email: z
      .union([z.string().trim().email().max(254), z.literal("")])
      .optional()
      .default(""),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        size: z.string().trim().min(1).max(40),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
  paymentMethod: z.enum(["cod", "razorpay"]),
  promoCode: z
    .string()
    .trim()
    .max(32)
    .optional()
    .default("")
    .transform((value) => value.replace(/\s+/g, "").toUpperCase()),
});

export const checkoutPromoSchema = z.object({
  promoCode: z
    .string()
    .trim()
    .min(3, "Enter a valid coupon or voucher code.")
    .max(32, "Coupon or voucher code is too long.")
    .transform((value) => value.replace(/\s+/g, "").toUpperCase()),
  phone: phoneSchema.optional(),
  items: checkoutSchema.shape.items,
});

export const razorpayVerificationSchema = z.object({
  token: z.string().min(20),
  razorpayOrderId: z.string().min(5).max(100),
  razorpayPaymentId: z.string().min(5).max(100),
  razorpaySignature: z.string().min(20).max(200),
});

export const cancellationSchema = z.object({
  token: z.string().min(20),
  paymentFailed: z.boolean().optional().default(false),
});

export const trackingSchema = z.object({
  orderReference: z.string().trim().min(8).max(80),
  phone: phoneSchema,
});
