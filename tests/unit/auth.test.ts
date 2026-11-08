import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validations/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { hasRole, isValidRole } from "@/lib/auth/rbac";
import { checkRateLimit } from "@/lib/rate-limit";

describe("Module 1 - Authentication & Security Tests", () => {
  // 1. Password Hashing Tests
  describe("Password Hashing & Verification (bcrypt)", () => {
    it("should hash a plaintext password and verify correctly", async () => {
      const plaintext = "SecurePass123!@#";
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(plaintext);
      expect(hash.startsWith("$2")).toBe(true);

      const isValid = await verifyPassword(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const hash = await hashPassword("CorrectPassword1!");
      const isValid = await verifyPassword("WrongPassword2@", hash);
      expect(isValid).toBe(false);
    });
  });

  // 2. JWT Session Security Tests
  describe("JWT Session Token Lifecycle", () => {
    it("should create and verify a signed JWT session payload", async () => {
      const payload = {
        userId: "user_test_123",
        email: "test@theblingcorner.in",
        name: "Test User",
        role: "CUSTOMER" as const,
      };

      const token = await createSessionToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe("CUSTOMER");
    });

    it("should reject a tampered or invalid JWT token", async () => {
      const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature";
      const decoded = await verifySessionToken(invalidToken);
      expect(decoded).toBeNull();
    });
  });

  // 3. Zod Input Validation Tests
  describe("Registration Input Validation Schema", () => {
    it("should accept valid registration inputs", () => {
      const valid = registerSchema.safeParse({
        name: "Pooja Sharma",
        email: "pooja@gmail.com",
        password: "StrongPassword123!",
        phone: "9876543210",
      });
      expect(valid.success).toBe(true);
    });

    it("should reject invalid email formats", () => {
      const invalidEmail = registerSchema.safeParse({
        name: "Pooja Sharma",
        email: "not-an-email",
        password: "StrongPassword123!",
      });
      expect(invalidEmail.success).toBe(false);
    });

    it("should reject passwords that fail security complexity rules", () => {
      // Missing special character
      const noSpecial = registerSchema.safeParse({
        name: "Pooja Sharma",
        email: "pooja@gmail.com",
        password: "NoSpecialChar123",
      });
      expect(noSpecial.success).toBe(false);

      // Too short (< 8 chars)
      const tooShort = registerSchema.safeParse({
        name: "Pooja Sharma",
        email: "pooja@gmail.com",
        password: "Sh1!",
      });
      expect(tooShort.success).toBe(false);
    });

    it("should reject invalid Indian phone numbers", () => {
      const invalidPhone = registerSchema.safeParse({
        name: "Pooja Sharma",
        email: "pooja@gmail.com",
        password: "StrongPassword123!",
        phone: "12345", // too short, doesn't start with 6-9
      });
      expect(invalidPhone.success).toBe(false);
    });
  });

  describe("Login Input Validation Schema", () => {
    it("should validate proper login inputs", () => {
      const valid = loginSchema.safeParse({
        email: "client@theblingcorner.in",
        password: "AnyPassword123",
      });
      expect(valid.success).toBe(true);
    });

    it("should reject missing password", () => {
      const invalid = loginSchema.safeParse({
        email: "client@theblingcorner.in",
        password: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 4. Role-Based Access Control (RBAC) Tests
  describe("Role-Based Authorization Rules", () => {
    it("should allow SUPER_ADMIN access to any role-restricted section", () => {
      expect(hasRole("SUPER_ADMIN", ["VENDOR"])).toBe(true);
      expect(hasRole("SUPER_ADMIN", ["CUSTOMER"])).toBe(true);
    });

    it("should allow VENDOR access only to vendor or customer endpoints", () => {
      expect(hasRole("VENDOR", ["VENDOR"])).toBe(true);
      expect(hasRole("VENDOR", ["SUPER_ADMIN"])).toBe(false);
    });

    it("should prevent regular CUSTOMER from accessing vendor or admin panels", () => {
      expect(hasRole("CUSTOMER", ["VENDOR"])).toBe(false);
      expect(hasRole("CUSTOMER", ["SUPER_ADMIN"])).toBe(false);
      expect(hasRole("CUSTOMER", ["CUSTOMER"])).toBe(true);
    });

    it("should validate allowed role identifiers", () => {
      expect(isValidRole("SUPER_ADMIN")).toBe(true);
      expect(isValidRole("VENDOR")).toBe(true);
      expect(isValidRole("CUSTOMER")).toBe(true);
      expect(isValidRole("HACKER")).toBe(false);
    });
  });

  // 5. Rate Limiting Tests
  describe("Anti-Brute-Force Rate Limiter", () => {
    it("should allow requests under the defined limit and throttle when exceeded", () => {
      const testIp = `test_ip_${Date.now()}`;
      const limit = 3;

      // 1st request
      const r1 = checkRateLimit(testIp, limit, 10000);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      // 2nd request
      const r2 = checkRateLimit(testIp, limit, 10000);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      // 3rd request
      const r3 = checkRateLimit(testIp, limit, 10000);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request -> throttled!
      const r4 = checkRateLimit(testIp, limit, 10000);
      expect(r4.success).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.resetInSec).toBeGreaterThan(0);
    });
  });
});

