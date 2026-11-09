import cloudinary, { isCloudinaryConfigured } from "@/lib/cloudinary";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class ImageUploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "ImageUploadError";
    this.status = status;
  }
}

export interface UploadedImage {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
}

export async function uploadImage(
  file: File,
  options: { folder: string; maxBytes: number }
): Promise<UploadedImage> {
  if (!isCloudinaryConfigured()) {
    throw new ImageUploadError(
      "Image upload is not configured. Please contact the store owner.",
      503
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ImageUploadError(
      "Please upload a JPG, PNG, WebP, HEIC, or HEIF image.",
      415
    );
  }

  if (file.size <= 0) {
    throw new ImageUploadError("The uploaded file is empty.", 400);
  }

  if (file.size > options.maxBytes) {
    throw new ImageUploadError(
      `Image is too large. Maximum size is ${Math.round(
        options.maxBytes / (1024 * 1024)
      )}MB.`,
      413
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: "image",
        transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
      },
      (error, uploaded) => {
        if (error) reject(error);
        else resolve(uploaded);
      }
    );
    uploadStream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
  };
}
