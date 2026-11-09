/**
 * Uploads a product image directly to Cloudinary (with fallback to Supabase Storage).
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
    console.warn(
      "Cloudinary upload failed, trying Supabase storage fallback:",
      err
    );
  }

  // 2. Fallback to Supabase Storage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const apiKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !apiKey) {
    throw new Error(
      "Image upload is unavailable. Configure Cloudinary or Supabase Storage."
    );
  }

  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/product-images/${fileName}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey,
      "x-upsert": "true",
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || "Failed to upload image.");
  }

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/product-images/${fileName}`;
}
