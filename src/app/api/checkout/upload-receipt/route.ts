import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, jsonError, rejectCrossOrigin } from "@/lib/http";
import {
  ImageUploadError,
  uploadImage,
} from "@/lib/cloudinary-upload";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/checkout/upload-receipt
 *
 * Guests need to attach a UPI payment screenshot before creating an order.
 * This route is intentionally separate from /api/upload (which is staff-only)
 * and is rate limited to reduce abuse.
 */
export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const rateLimited = enforceRateLimit(
    request,
    "checkout_receipt_upload",
    10,
    10 * 60 * 1000
  );
  if (rateLimited) return rateLimited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("No receipt image provided.", 400);
    }

    const uploaded = await uploadImage(file, {
      folder: "theblingcorner/receipts",
      maxBytes: MAX_RECEIPT_BYTES,
    });

    return NextResponse.json({
      success: true,
      ...uploaded,
    });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return jsonError(error.message, error.status);
    }
    console.error("[RECEIPT_UPLOAD_ERROR]", error);
    return jsonError("Failed to upload receipt image.", 500);
  }
}
