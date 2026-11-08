import { describe, it, expect } from "vitest";
import {
  calculateShippingFee,
  resolvePincodeZone,
  SHIPPING_RATE_MATRIX,
  ShippingZone,
} from "@/lib/shipping";

describe("Module 4 - Dynamic Shipping Rate Engine Tests (chart.jpeg)", () => {
  // 1. Verify Client Rate Matrix against chart.jpeg
  describe("Official Slabs Verification (w.e.f. August 2026)", () => {
    it("should match exact rate card for LOCAL deliveries", () => {
      expect(calculateShippingFee(300, "LOCAL")).toBe(34);
      expect(calculateShippingFee(500, "LOCAL")).toBe(34);
      expect(calculateShippingFee(750, "LOCAL")).toBe(56);
      expect(calculateShippingFee(1000, "LOCAL")).toBe(56);
      expect(calculateShippingFee(1200, "LOCAL")).toBe(70);
      expect(calculateShippingFee(1500, "LOCAL")).toBe(70);
      expect(calculateShippingFee(1800, "LOCAL")).toBe(103);
      expect(calculateShippingFee(2000, "LOCAL")).toBe(103);
    });

    it("should match exact rate card for WITHIN_STATE deliveries", () => {
      expect(calculateShippingFee(400, "WITHIN_STATE")).toBe(77);
      expect(calculateShippingFee(500, "WITHIN_STATE")).toBe(77);
      expect(calculateShippingFee(900, "WITHIN_STATE")).toBe(107);
      expect(calculateShippingFee(1000, "WITHIN_STATE")).toBe(107);
      expect(calculateShippingFee(1400, "WITHIN_STATE")).toBe(139);
      expect(calculateShippingFee(1500, "WITHIN_STATE")).toBe(139);
      expect(calculateShippingFee(1900, "WITHIN_STATE")).toBe(188);
      expect(calculateShippingFee(2000, "WITHIN_STATE")).toBe(188);
    });

    it("should match exact rate card for ZONE_METRO deliveries", () => {
      expect(calculateShippingFee(350, "ZONE_METRO")).toBe(82);
      expect(calculateShippingFee(500, "ZONE_METRO")).toBe(82);
      expect(calculateShippingFee(800, "ZONE_METRO")).toBe(126);
      expect(calculateShippingFee(1000, "ZONE_METRO")).toBe(126);
      expect(calculateShippingFee(1300, "ZONE_METRO")).toBe(168);
      expect(calculateShippingFee(1500, "ZONE_METRO")).toBe(168);
      expect(calculateShippingFee(1850, "ZONE_METRO")).toBe(234);
      expect(calculateShippingFee(2000, "ZONE_METRO")).toBe(234);
    });

    it("should match exact rate card for OTHER_STATE deliveries", () => {
      expect(calculateShippingFee(200, "OTHER_STATE")).toBe(84);
      expect(calculateShippingFee(500, "OTHER_STATE")).toBe(84);
      expect(calculateShippingFee(700, "OTHER_STATE")).toBe(134);
      expect(calculateShippingFee(1000, "OTHER_STATE")).toBe(134);
      expect(calculateShippingFee(1250, "OTHER_STATE")).toBe(201);
      expect(calculateShippingFee(1500, "OTHER_STATE")).toBe(201);
      expect(calculateShippingFee(1950, "OTHER_STATE")).toBe(283);
      expect(calculateShippingFee(2000, "OTHER_STATE")).toBe(283);
    });
  });

  // 2. Heavy Parcels (> 2000g) Pro-Rata Tests
  describe("Heavy Parcels (> 2000g) Surcharge", () => {
    it("should calculate pro-rata incremental charge for parcels above 2000g", () => {
      // 2300g is 1 extra 500g block above 2000g
      const localFee2300 = calculateShippingFee(2300, "LOCAL");
      expect(localFee2300).toBe(103 + 25); // 128

      const metroFee2400 = calculateShippingFee(2400, "ZONE_METRO");
      expect(metroFee2400).toBe(234 + 50); // 284

      // 3200g is 3 extra 500g blocks above 2000g (2000 + 1200g => 3 blocks)
      const otherStateFee3200 = calculateShippingFee(3200, "OTHER_STATE");
      expect(otherStateFee3200).toBe(283 + 3 * 60); // 463
    });
  });

  // 3. Indian Pincode to Zone Resolver Tests
  describe("Pincode-to-Zone Resolver", () => {
    it("should resolve local city pincodes correctly", () => {
      const res = resolvePincodeZone("400001", "Maharashtra");
      expect(res.zone).toBe("LOCAL");
      expect(res.state).toBe("Maharashtra");
      expect(res.city).toContain("Mumbai");
    });

    it("should resolve intra-state pincodes as WITHIN_STATE", () => {
      const res = resolvePincodeZone("440001", "Maharashtra"); // Nagpur
      expect(res.zone).toBe("WITHIN_STATE");
      expect(res.state).toBe("Maharashtra");
    });

    it("should resolve tier-1 metros outside origin state as ZONE_METRO", () => {
      // Delhi (110001)
      const delhi = resolvePincodeZone("110001", "Maharashtra");
      expect(delhi.zone).toBe("ZONE_METRO");
      expect(delhi.state).toBe("Delhi");

      // Bengaluru (560001)
      const blr = resolvePincodeZone("560001", "Maharashtra");
      expect(blr.zone).toBe("ZONE_METRO");
      expect(blr.state).toBe("Karnataka");

      // Kolkata (700001)
      const kolkata = resolvePincodeZone("700001", "Maharashtra");
      expect(kolkata.zone).toBe("ZONE_METRO");
      expect(kolkata.state).toBe("West Bengal");
    });

    it("should resolve non-metro outstation pincodes as OTHER_STATE", () => {
      // Jaipur non-metro or Patna (800001)
      const patna = resolvePincodeZone("800001", "Maharashtra");
      expect(patna.zone).toBe("OTHER_STATE");
      expect(patna.state).toBe("Bihar");
    });

    it("should fallback gracefully for invalid or incomplete pincodes", () => {
      const invalid = resolvePincodeZone("123");
      expect(invalid.zone).toBe("OTHER_STATE");
      expect(invalid.estimatedDays).toBeDefined();
    });
  });
});

