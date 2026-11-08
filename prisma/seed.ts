import { PrismaClient, Role, ShippingZoneType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting The Bling Corner database seeding...");

  // 1. Seed Super Admin (You)
  const adminPasswordHash = await bcrypt.hash(
    process.env.ADMIN_INITIAL_PASSWORD || "SecureBlingAdmin2026!",
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: "admin@theblingcorner.in" },
    update: { role: Role.SUPER_ADMIN },
    create: {
      name: "Master Admin",
      email: "admin@theblingcorner.in",
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`✅ Super Admin configured: ${admin.email}`);

  // 2. Seed Store Owner / Client (The Bling Corner Vendor)
  const vendorPasswordHash = await bcrypt.hash("BlingStoreOwner2026!", 12);
  const vendor = await prisma.user.upsert({
    where: { email: "client@theblingcorner.in" },
    update: { role: Role.VENDOR },
    create: {
      name: "The Bling Corner Store Owner",
      email: "client@theblingcorner.in",
      passwordHash: vendorPasswordHash,
      role: Role.VENDOR,
    },
  });
  console.log(`✅ Store Owner configured: ${vendor.email}`);

  // 3. Seed Product Categories (from client inventory screenshot)
  const categoriesData = [
    { name: "Keychains", slug: "keychains", description: "Trendy aesthetic keychains, light lamps, and bells", displayOrder: 1 },
    { name: "Hair clips", slug: "hair-clips", description: "Aesthetic pearl, character, and resin hair clips", displayOrder: 2 },
    { name: "Stationery", slug: "stationery", description: "Cute diaries, gel pens, washi tapes, and sticky notes", displayOrder: 3 },
    { name: "Bracelets", slug: "bracelets", description: "Handcrafted glass bead, crystal, and custom charm bracelets", displayOrder: 4 },
    { name: "Charms", slug: "charms", description: "Phone charms, bag charms, and miniature cute charms", displayOrder: 5 },
    { name: "Wipes", slug: "wipes", description: "Mini and can aesthetic pocket wipes", displayOrder: 6 },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, displayOrder: cat.displayOrder },
      create: cat,
    });
    createdCategories[cat.slug] = c.id;
  }
  console.log(`✅ Seeded ${categoriesData.length} core product categories.`);

  // 4. Seed Representative Client Products (Directly from Client Screenshot)
  const sampleProducts = [
    // Keychains
    {
      title: "Cloud Lamp Keychain with Light",
      slug: "cloud-lamp-keychain-light",
      description: "Adorable illuminated cloud lamp keychain with gentle warm LED glow. A viral favorite on Instagram reels!",
      price: 199,
      comparePrice: 249,
      weightGrams: 150,
      stockQuantity: 12,
      categorySlug: "keychains",
      isFeatured: true,
      images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"],
    },
    {
      title: "Starbucks Mini Drink Keychain",
      slug: "starbucks-mini-drink-keychain",
      description: "Miniature Starbucks frappuccino keychain with realistic ice and straw details.",
      price: 149,
      comparePrice: 199,
      weightGrams: 100,
      stockQuantity: 15,
      categorySlug: "keychains",
      isFeatured: true,
      images: ["https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"],
    },
    {
      title: "Cute Bear Bell Keychain",
      slug: "cute-bear-bell-keychain",
      description: "Resin pastel bear with ringing bell chime and silicone wrist strap.",
      price: 129,
      comparePrice: 179,
      weightGrams: 120,
      stockQuantity: 20,
      categorySlug: "keychains",
      isFeatured: false,
      images: ["https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80"],
    },
    // Hair Clips
    {
      title: "Kuromi Aesthetic Hair Clip",
      slug: "kuromi-aesthetic-hair-clip",
      description: "Y2K Sanrio Kuromi character hair clip. High-grip resin claw for all hair styles.",
      price: 149,
      comparePrice: 189,
      weightGrams: 80,
      stockQuantity: 18,
      categorySlug: "hair-clips",
      isFeatured: true,
      images: ["https://images.unsplash.com/photo-1590736704728-f4730bb30770?auto=format&fit=crop&w=600&q=80"],
    },
    {
      title: "Luxury Pearl Blossom Hair Clip",
      slug: "luxury-pearl-blossom-hair-clip",
      description: "Handcrafted faux pearl and crystal hair slide with gold finish.",
      price: 179,
      comparePrice: 229,
      weightGrams: 90,
      stockQuantity: 10,
      categorySlug: "hair-clips",
      isFeatured: false,
      images: ["https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&w=600&q=80"],
    },
    // Stationery
    {
      title: "A5 Hardcover Aesthetic Diary",
      slug: "a5-hardcover-aesthetic-diary",
      description: "Premium pastel A5 lined journal notebook with gold foil stamping and ribbon bookmark.",
      price: 299,
      comparePrice: 399,
      weightGrams: 350,
      stockQuantity: 14,
      categorySlug: "stationery",
      isFeatured: true,
      images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"],
    },
    {
      title: "Pastel Gel Pen Set (Matcha & Tea Taste)",
      slug: "pastel-gel-pen-set-matcha",
      description: "Set of 4 smooth 0.5mm quick-dry black ink pens in aesthetic pastel green & tea barrels.",
      price: 199,
      comparePrice: 249,
      weightGrams: 140,
      stockQuantity: 25,
      categorySlug: "stationery",
      isFeatured: false,
      images: ["https://images.unsplash.com/photo-1585336261026-70e6378fb777?auto=format&fit=crop&w=600&q=80"],
    },
    // Bracelets
    {
      title: "Handcrafted Evil Eye Crystal Bracelet",
      slug: "evil-eye-crystal-bracelet",
      description: "Handcrafted protective evil eye bead bracelet with faceted crystal accents and elastic fit.",
      price: 249,
      comparePrice: 329,
      weightGrams: 90,
      stockQuantity: 16,
      categorySlug: "bracelets",
      isFeatured: true,
      images: ["https://images.unsplash.com/photo-1611591475883-8a303683a48e?auto=format&fit=crop&w=600&q=80"],
    },
    {
      title: "Pastel Crystal Bow Beaded Bracelet",
      slug: "pastel-crystal-bow-bracelet",
      description: "Romantic glass bead and pearl bow charm bracelet.",
      price: 229,
      comparePrice: 289,
      weightGrams: 100,
      stockQuantity: 8,
      categorySlug: "bracelets",
      isFeatured: false,
      images: ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80"],
    },
    // Charms
    {
      title: "Tulip Pearl Aesthetic Phone Charm",
      slug: "tulip-pearl-aesthetic-phone-charm",
      description: "Delicate beaded phone strap wristlet with resin tulip blossoms and freshwater pearls.",
      price: 179,
      comparePrice: 229,
      weightGrams: 70,
      stockQuantity: 22,
      categorySlug: "charms",
      isFeatured: true,
      images: ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80"],
    },
    {
      title: "Miniature Drink Bag Charm (Monster & Redbull)",
      slug: "miniature-drink-bag-charm",
      description: "Ultra-detailed mini energy can charm for backpacks, totes, and key rings.",
      price: 139,
      comparePrice: 179,
      weightGrams: 60,
      stockQuantity: 30,
      categorySlug: "charms",
      isFeatured: false,
      images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80"],
    },
    // Wipes
    {
      title: "Aesthetic Mini Pocket Wipes Can",
      slug: "aesthetic-mini-pocket-wipes-can",
      description: "Compact pull-out sanitized wipes inside a cute soda can container with keychain loop.",
      price: 99,
      comparePrice: 129,
      weightGrams: 130,
      stockQuantity: 40,
      categorySlug: "wipes",
      isFeatured: false,
      images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80"],
    },
  ];

  for (const item of sampleProducts) {
    const categoryId = createdCategories[item.categorySlug];
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        price: item.price,
        comparePrice: item.comparePrice,
        weightGrams: item.weightGrams,
        stockQuantity: item.stockQuantity,
        isFeatured: item.isFeatured,
      },
      create: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        price: item.price,
        comparePrice: item.comparePrice,
        weightGrams: item.weightGrams,
        stockQuantity: item.stockQuantity,
        categoryId: categoryId,
        isFeatured: item.isFeatured,
        isActive: true,
        images: {
          create: item.images.map((url, i) => ({
            url,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        },
      },
    });
  }
  console.log(`✅ Seeded ${sampleProducts.length} client catalog items.`);

  // 5. Seed Official Shipping Slabs (from client rate chart: chart.jpeg)
  const shippingSlabs: Array<{
    maxWeight: number;
    zone: ShippingZoneType;
    price: number;
  }> = [
    // <= 500g
    { maxWeight: 500, zone: ShippingZoneType.LOCAL, price: 34 },
    { maxWeight: 500, zone: ShippingZoneType.WITHIN_STATE, price: 77 },
    { maxWeight: 500, zone: ShippingZoneType.ZONE_METRO, price: 82 },
    { maxWeight: 500, zone: ShippingZoneType.OTHER_STATE, price: 84 },

    // 501g - 1000g
    { maxWeight: 1000, zone: ShippingZoneType.LOCAL, price: 56 },
    { maxWeight: 1000, zone: ShippingZoneType.WITHIN_STATE, price: 107 },
    { maxWeight: 1000, zone: ShippingZoneType.ZONE_METRO, price: 126 },
    { maxWeight: 1000, zone: ShippingZoneType.OTHER_STATE, price: 134 },

    // 1001g - 1500g
    { maxWeight: 1500, zone: ShippingZoneType.LOCAL, price: 70 },
    { maxWeight: 1500, zone: ShippingZoneType.WITHIN_STATE, price: 139 },
    { maxWeight: 1500, zone: ShippingZoneType.ZONE_METRO, price: 168 },
    { maxWeight: 1500, zone: ShippingZoneType.OTHER_STATE, price: 201 },

    // 1501g - 2000g
    { maxWeight: 2000, zone: ShippingZoneType.LOCAL, price: 103 },
    { maxWeight: 2000, zone: ShippingZoneType.WITHIN_STATE, price: 188 },
    { maxWeight: 2000, zone: ShippingZoneType.ZONE_METRO, price: 234 },
    { maxWeight: 2000, zone: ShippingZoneType.OTHER_STATE, price: 283 },
  ];

  for (const slab of shippingSlabs) {
    await prisma.shippingRateRule.upsert({
      where: {
        maxWeight_zone: {
          maxWeight: slab.maxWeight,
          zone: slab.zone,
        },
      },
      update: { price: slab.price },
      create: slab,
    });
  }
  console.log(`✅ Seeded ${shippingSlabs.length} official courier rate rules.`);
  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
