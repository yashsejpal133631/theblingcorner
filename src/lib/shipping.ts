export type ShippingZone = "LOCAL" | "WITHIN_STATE" | "ZONE_METRO" | "OTHER_STATE";

export interface ShippingCalculationResult {
  zone: ShippingZone;
  weightGrams: number;
  rate: number;
  state: string;
  city: string;
  estimatedDeliveryDays: string;
}

// Client's official Courier Rate Card (w.e.f. August 2026 from chart.jpeg)
export const SHIPPING_RATE_MATRIX: Record<
  ShippingZone,
  Array<{ maxWeight: number; price: number }>
> = {
  LOCAL: [
    { maxWeight: 500, price: 34 },
    { maxWeight: 1000, price: 56 },
    { maxWeight: 1500, price: 70 },
    { maxWeight: 2000, price: 103 },
  ],
  WITHIN_STATE: [
    { maxWeight: 500, price: 77 },
    { maxWeight: 1000, price: 107 },
    { maxWeight: 1500, price: 139 },
    { maxWeight: 2000, price: 188 },
  ],
  ZONE_METRO: [
    { maxWeight: 500, price: 82 },
    { maxWeight: 1000, price: 126 },
    { maxWeight: 1500, price: 168 },
    { maxWeight: 2000, price: 234 },
  ],
  OTHER_STATE: [
    { maxWeight: 500, price: 84 },
    { maxWeight: 1000, price: 134 },
    { maxWeight: 1500, price: 201 },
    { maxWeight: 2000, price: 283 },
  ],
};

// Major Metro Pincode Prefixes (Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad, Ahmedabad, Pune)
const METRO_PINCODE_PREFIXES = [
  "110", // Delhi
  "400", // Mumbai
  "560", // Bengaluru
  "700", // Kolkata
  "600", // Chennai
  "500", // Hyderabad
  "380", // Ahmedabad
  "411", // Pune
];

// Indian State prefixes based on postal zones
const PINCODE_STATE_MAP: Record<string, { state: string; city: string }> = {
  "11": { state: "Delhi", city: "New Delhi" },
  "12": { state: "Haryana", city: "Gurugram / Faridabad" },
  "13": { state: "Haryana", city: "Ambala / Panipat" },
  "14": { state: "Punjab", city: "Ludhiana / Jalandhar" },
  "15": { state: "Punjab", city: "Bathinda" },
  "16": { state: "Chandigarh", city: "Chandigarh" },
  "17": { state: "Himachal Pradesh", city: "Shimla" },
  "18": { state: "Jammu and Kashmir", city: "Jammu" },
  "19": { state: "Jammu and Kashmir", city: "Srinagar" },
  "20": { state: "Uttar Pradesh", city: "Noida / Ghaziabad" },
  "21": { state: "Uttar Pradesh", city: "Prayagraj" },
  "22": { state: "Uttar Pradesh", city: "Lucknow" },
  "23": { state: "Uttar Pradesh", city: "Varanasi" },
  "24": { state: "Uttarakhand", city: "Dehradun" },
  "25": { state: "Uttar Pradesh", city: "Meerut" },
  "26": { state: "Uttar Pradesh", city: "Bareilly" },
  "27": { state: "Uttar Pradesh", city: "Gorakhpur" },
  "28": { state: "Uttar Pradesh", city: "Agra / Jhansi" },
  "30": { state: "Rajasthan", city: "Jaipur" },
  "31": { state: "Rajasthan", city: "Udaipur" },
  "32": { state: "Rajasthan", city: "Kota" },
  "33": { state: "Rajasthan", city: "Bikaner" },
  "34": { state: "Rajasthan", city: "Jodhpur" },
  "36": { state: "Gujarat", city: "Rajkot" },
  "37": { state: "Gujarat", city: "Kutch" },
  "38": { state: "Gujarat", city: "Ahmedabad" },
  "39": { state: "Gujarat", city: "Surat / Vadodara" },
  "40": { state: "Maharashtra", city: "Mumbai / Navi Mumbai" },
  "41": { state: "Maharashtra", city: "Pune" },
  "42": { state: "Maharashtra", city: "Nashik" },
  "43": { state: "Maharashtra", city: "Aurangabad" },
  "44": { state: "Maharashtra", city: "Nagpur" },
  "45": { state: "Madhya Pradesh", city: "Indore" },
  "46": { state: "Madhya Pradesh", city: "Bhopal" },
  "47": { state: "Madhya Pradesh", city: "Gwalior" },
  "48": { state: "Madhya Pradesh", city: "Jabalpur" },
  "49": { state: "Chhattisgarh", city: "Raipur" },
  "50": { state: "Telangana", city: "Hyderabad" },
  "51": { state: "Andhra Pradesh", city: "Tirupati" },
  "52": { state: "Andhra Pradesh", city: "Vijayawada" },
  "53": { state: "Andhra Pradesh", city: "Visakhapatnam" },
  "56": { state: "Karnataka", city: "Bengaluru" },
  "57": { state: "Karnataka", city: "Mangaluru" },
  "58": { state: "Karnataka", city: "Hubballi" },
  "59": { state: "Karnataka", city: "Belagavi" },
  "60": { state: "Tamil Nadu", city: "Chennai" },
  "61": { state: "Tamil Nadu", city: "Thanjavur" },
  "62": { state: "Tamil Nadu", city: "Madurai" },
  "63": { state: "Tamil Nadu", city: "Salem" },
  "64": { state: "Tamil Nadu", city: "Coimbatore" },
  "67": { state: "Kerala", city: "Kozhikode" },
  "68": { state: "Kerala", city: "Kochi" },
  "69": { state: "Kerala", city: "Thiruvananthapuram" },
  "70": { state: "West Bengal", city: "Kolkata" },
  "71": { state: "West Bengal", city: "Howrah" },
  "72": { state: "West Bengal", city: "Midnapore" },
  "73": { state: "West Bengal", city: "Siliguri" },
  "74": { state: "West Bengal", city: "24 Parganas" },
  "75": { state: "Odisha", city: "Bhubaneswar" },
  "76": { state: "Odisha", city: "Cuttack" },
  "78": { state: "Assam", city: "Guwahati" },
  "79": { state: "North East States", city: "Shillong / Imphal" },
  "80": { state: "Bihar", city: "Patna" },
  "81": { state: "Bihar", city: "Bhagalpur" },
  "82": { state: "Bihar", city: "Gaya" },
  "83": { state: "Jharkhand", city: "Ranchi" },
  "84": { state: "Bihar", city: "Muzaffarpur" },
  "85": { state: "Bihar", city: "Purnia" },
};

// Store default origin state (e.g. Maharashtra or Delhi)
const DEFAULT_ORIGIN_STATE = "Maharashtra";
const DEFAULT_ORIGIN_CITY_PREFIX = "40"; // Mumbai area

/**
 * Resolves destination zone based on Indian 6-digit Pincode
 */
export function resolvePincodeZone(
  pincode: string,
  originState: string = DEFAULT_ORIGIN_STATE
): { zone: ShippingZone; state: string; city: string; estimatedDays: string } {
  const cleanPin = pincode.trim().replace(/\D/g, "");
  if (cleanPin.length !== 6) {
    return {
      zone: "OTHER_STATE",
      state: "India",
      city: "Unknown",
      estimatedDays: "4-6 Business Days",
    };
  }

  const prefix2 = cleanPin.substring(0, 2);
  const prefix3 = cleanPin.substring(0, 3);
  const location = PINCODE_STATE_MAP[prefix2] || { state: "India", city: "Outstation" };

  // 1. Check Local (Same city/hub prefix)
  if (cleanPin.startsWith(DEFAULT_ORIGIN_CITY_PREFIX)) {
    return {
      zone: "LOCAL",
      state: location.state,
      city: location.city,
      estimatedDays: "1-2 Business Days",
    };
  }

  // 2. Check Within State
  if (location.state.toLowerCase() === originState.toLowerCase()) {
    return {
      zone: "WITHIN_STATE",
      state: location.state,
      city: location.city,
      estimatedDays: "2-3 Business Days",
    };
  }

  // 3. Check Major Metro
  if (METRO_PINCODE_PREFIXES.includes(prefix3)) {
    return {
      zone: "ZONE_METRO",
      state: location.state,
      city: location.city,
      estimatedDays: "3-4 Business Days",
    };
  }

  // 4. Default: Other State / Rest of India
  return {
    zone: "OTHER_STATE",
    state: location.state,
    city: location.city,
    estimatedDays: "4-6 Business Days",
  };
}

/**
 * Computes exact courier delivery charge from weight in grams and zone
 * based on client rate chart (chart.jpeg)
 */
export function calculateShippingFee(weightGrams: number, zone: ShippingZone): number {
  const slabs = SHIPPING_RATE_MATRIX[zone];
  const weight = Math.max(50, weightGrams); // minimum baseline 50g

  // Check defined slabs: <= 500g, <= 1000g, <= 1500g, <= 2000g
  for (const slab of slabs) {
    if (weight <= slab.maxWeight) {
      return slab.price;
    }
  }

  // For parcels heavier than 2000g, add pro-rata rate per 500g slab
  const base2000 = slabs[slabs.length - 1].price;
  const extraWeight = weight - 2000;
  const extra500gBlocks = Math.ceil(extraWeight / 500);

  // Incremental fee per 500g based on zone differential
  const incrementalPer500g: Record<ShippingZone, number> = {
    LOCAL: 25,
    WITHIN_STATE: 40,
    ZONE_METRO: 50,
    OTHER_STATE: 60,
  };

  return base2000 + extra500gBlocks * incrementalPer500g[zone];
}

