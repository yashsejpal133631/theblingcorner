import { describe, it, expect } from "vitest";
import { productSchema, productUpdateSchema } from "@/lib/validations/product";
import { formatPrice } from "@/lib/utils";

describe("Module 2 - Product Catalog & Validation Tests", () => {
  // 1. Product Schema Validation
  describe("Product Creation Validation", () => {
    it("should accept valid product data matching client catalog", () => {
      const valid = productSchema.safeParse({
        title: "Cloud Lamp Keychain with Light",
        description: "Cute illuminated cloud lamp keychain with gentle warm LED glow.",
        price: 199,
        comparePrice: 249,
        weightGrams: 150,
        stockQuantity: 12,
        categoryId: "cat_keychains_123",
        isFeatured: true,
        images: ["https://example.com/cloud.jpg"],
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.weightGrams).toBe(150);
        expect(valid.data.price).toBe(199);
      }
    });

    it("should reject invalid/negative prices", () => {
      const invalidPrice = productSchema.safeParse({
        title: "Sample Ring",
        description: "Valid description here.",
        price: -50,
        categoryId: "cat_123",
      });
      expect(invalidPrice.success).toBe(false);
    });

    it("should reject negative stock quantity", () => {
      const invalidStock = productSchema.safeParse({
        title: "Sample Bracelet",
        description: "Valid description here.",
        price: 150,
        stockQuantity: -5,
        categoryId: "cat_123",
      });
      expect(invalidStock.success).toBe(false);
    });

    it("should reject missing category", () => {
      const noCategory = productSchema.safeParse({
        title: "Sample Hair Clip",
        description: "Valid description here.",
        price: 100,
        categoryId: "",
      });
      expect(noCategory.success).toBe(false);
    });
  });

  // 2. Product Update Schema
  describe("Product Partial Update Schema", () => {
    it("should allow partial stock or price updates", () => {
      const updateStock = productUpdateSchema.safeParse({
        stockQuantity: 25,
      });
      expect(updateStock.success).toBe(true);

      const updatePrice = productUpdateSchema.safeParse({
        price: 180,
        comparePrice: 220,
      });
      expect(updatePrice.success).toBe(true);
    });
  });

  // 3. Indian Currency Formatting (₹)
  describe("Indian Rupee (₹) Price Formatter", () => {
    it("should format whole integer amounts into Indian Rupee style", () => {
      const formatted = formatPrice(199);
      expect(formatted).toContain("199");
      expect(formatted).toMatch(/₹|INR/);
    });

    it("should correctly handle thousands grouping", () => {
      const formatted = formatPrice(1499);
      expect(formatted).toMatch(/1,499/);
    });
  });

  // 4. Discount Math
  describe("Discount Percentage Calculation", () => {
    it("should correctly compute percentage savings", () => {
      const price = 199;
      const comparePrice = 249;
      const discount = Math.round(((comparePrice - price) / comparePrice) * 100);
      expect(discount).toBe(20);
    });
  });
});

