import { v2 as cloudinary } from "cloudinary";

const cloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
  process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
  "";
const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

export const cloudinaryConfig = {
  cloudName,
  apiKey,
  hasSecret: Boolean(apiSecret),
};

export default cloudinary;
