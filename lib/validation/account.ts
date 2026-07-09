import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z.string().trim().max(max).optional().default("");

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .default("")
  .refine((value) => {
    if (!value) return true;
    return value.replace(/\D/g, "").slice(-10).length === 10;
  }, "Enter a valid 10-digit mobile number.");

const optionalPincodeSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => !value || /^[1-9][0-9]{5}$/.test(value), {
    message: "Enter a valid 6-digit pincode.",
  });

export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: optionalPhoneSchema,
  address: optionalTrimmed(300),
  city: optionalTrimmed(80),
  state: optionalTrimmed(80),
  pincode: optionalPincodeSchema,
  landmark: optionalTrimmed(160),
});

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
