import { z } from "zod";

export const productSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: "Product title must be at least 2 characters." })
    .max(120, { message: "Title cannot exceed 120 characters." }),
  description: z
    .string()
    .trim()
    .min(5, { message: "Description must be at least 5 characters long." }),
  price: z.coerce
    .number()
    .positive({ message: "Price must be a positive number greater than 0." }),
  comparePrice: z.coerce
    .number()
    .positive({ message: "Original/compare price must be greater than 0." })
    .optional()
    .nullable(),
  weightGrams: z.coerce
    .number()
    .int()
    .positive({ message: "Package weight must be an integer in grams (e.g. 150)." })
    .default(150),
  stockQuantity: z.coerce
    .number()
    .int()
    .min(0, { message: "Stock quantity cannot be negative." })
    .default(0),
  categoryId: z.string().min(1, { message: "Please select a product category." }),
  sku: z.string().trim().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z
    .array(z.string().url({ message: "Each image must be a valid URL." }))
    .default([]),
  variants: z
    .array(
      z.object({
        title: z.string().trim().min(1, { message: "Variant name is required." }),
        price: z.coerce.number().positive().optional().nullable(),
        stock: z.coerce.number().int().min(0).default(0),
        sku: z.string().trim().optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

export const productUpdateSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

