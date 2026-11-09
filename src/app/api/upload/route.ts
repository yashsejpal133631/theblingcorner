import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { jsonError, rejectCrossOrigin } from "@/lib/http";
import {
  ImageUploadError,
  uploadImage,
} from "@/lib/cloudinary-upload";

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["VENDOR", "SUPER_ADMIN"])) {
      return jsonError(
        "Unauthorized. Store owner or admin access required.",
        401
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("No image file provided.", 400);
    }

    const uploaded = await uploadImage(file, {
      folder: "theblingcorner/products",
      maxBytes: MAX_PRODUCT_IMAGE_BYTES,
    });

    return NextResponse.json({
      success: true,
      ...uploaded,
    });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return jsonError(error.message, error.status);
    }
    console.error("[CLOUDINARY_UPLOAD_ERROR]", error);
    return jsonError("Failed to upload image.", 500);
  }
}
