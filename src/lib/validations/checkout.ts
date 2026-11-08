import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Recipient name must be at least 2 characters." })
    .max(60, { message: "Name cannot exceed 60 characters." }),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, { message: "Please provide a valid 10-digit Indian phone number." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Please provide a valid email address for order confirmation." }),
  street: z
    .string()
    .trim()
    .min(5, { message: "Please enter your street address, house/flat number." })
    .max(200),
  landmark: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(2, { message: "City name is required." }),
  state: z.string().trim().min(2, { message: "State is required." }),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, { message: "Please enter a valid 6-digit Indian postal pincode." }),
});

export const checkoutOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().positive({ message: "Quantity must be at least 1." }),
      })
    )
    .min(1, { message: "Your cart is empty. Please add items to checkout." }),
  shippingAddress: shippingAddressSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;

