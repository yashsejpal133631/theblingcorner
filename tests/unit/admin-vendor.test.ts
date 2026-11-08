import { describe, it, expect } from "vitest";
import { hasRole, Role } from "@/lib/auth/rbac";
import { z } from "zod";

const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["CUSTOMER", "VENDOR", "SUPER_ADMIN"]),
});

describe("Module 7: Store Owner & Super Admin RBAC & Analytics", () => {
  describe("RBAC Access Permissions", () => {
    it("allows VENDOR and SUPER_ADMIN to access vendor features", () => {
      expect(hasRole("VENDOR", ["VENDOR", "SUPER_ADMIN"])).toBe(true);
      expect(hasRole("SUPER_ADMIN", ["VENDOR", "SUPER_ADMIN"])).toBe(true);
      expect(hasRole("CUSTOMER", ["VENDOR", "SUPER_ADMIN"])).toBe(false);
    });

    it("allows only SUPER_ADMIN to access root master console", () => {
      expect(hasRole("SUPER_ADMIN", ["SUPER_ADMIN"])).toBe(true);
      expect(hasRole("VENDOR", ["SUPER_ADMIN"])).toBe(false);
      expect(hasRole("CUSTOMER", ["SUPER_ADMIN"])).toBe(false);
    });

    it("handles undefined or guest roles safely", () => {
      expect(hasRole(undefined, ["VENDOR"])).toBe(false);
      expect(hasRole(null as any, ["SUPER_ADMIN"])).toBe(false);
    });
  });

  describe("Vendor Stats Aggregation Logic", () => {
    const mockOrders = [
      { totalAmount: 499, status: "PAID" },
      { totalAmount: 799, status: "SHIPPED" },
      { totalAmount: 299, status: "DELIVERED" },
      { totalAmount: 399, status: "PENDING_PAYMENT" }, // not paid yet
      { totalAmount: 599, status: "CANCELLED" }, // cancelled
    ];

    it("calculates gross revenue excluding pending and cancelled orders", () => {
      const totalRevenue = mockOrders
        .filter((o) => o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT")
        .reduce((acc, curr) => acc + curr.totalAmount, 0);

      expect(totalRevenue).toBe(499 + 799 + 299); // 1597
    });

    it("identifies low stock and out-of-stock threshold boundaries", () => {
      const mockStock = [
        { title: "Item 1", stock: 12 },
        { title: "Item 2", stock: 4 }, // low stock
        { title: "Item 3", stock: 2 }, // low stock
        { title: "Item 4", stock: 0 }, // out of stock
      ];

      const lowStockCount = mockStock.filter((p) => p.stock <= 5 && p.stock > 0).length;
      const outOfStockCount = mockStock.filter((p) => p.stock === 0).length;

      expect(lowStockCount).toBe(2);
      expect(outOfStockCount).toBe(1);
    });
  });

  describe("Admin Role Update Schema Validation", () => {
    it("accepts valid role promotion payloads", () => {
      expect(
        updateUserRoleSchema.safeParse({ userId: "u123", role: "VENDOR" }).success
      ).toBe(true);
      expect(
        updateUserRoleSchema.safeParse({ userId: "u123", role: "SUPER_ADMIN" }).success
      ).toBe(true);
    });

    it("rejects unauthorized arbitrary role names", () => {
      expect(
        updateUserRoleSchema.safeParse({ userId: "u123", role: "HACKER" }).success
      ).toBe(false);
      expect(
        updateUserRoleSchema.safeParse({ userId: "u123", role: "" }).success
      ).toBe(false);
    });
  });
});

