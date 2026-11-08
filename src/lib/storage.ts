/**
 * Uploads a product image directly to Cloudinary (with fallback to Supabase Storage)
 * 100% Free Tier ($0 / Zero Billing), No credit card required.
 */
export async function uploadProductImage(file: File): Promise<string> {
  // 1. Try Cloudinary via secure server API route
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn("Cloudinary upload failed, trying Supabase storage fallback:", err);
  }

  // 2. Fallback to Supabase Storage
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ptpywwirakaikotcmkkj.supabase.co";
  const apiKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_JV7u60mOCz7TpFls-Gik7A_Xggn1X1S";

  const fileExt = file.name.split(".").pop() || "jpg";
  const cleanExt = fileExt.toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

  const uploadEndpoint = `${supabaseUrl}/storage/v1/object/products/${fileName}`;

  const res = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to upload image to cloud storage.");
  }

  return `${supabaseUrl}/storage/v1/object/public/products/${fileName}`;
}
