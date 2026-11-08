import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "fkhfggwt",
  api_key: process.env.CLOUDINARY_API_KEY || "865827238965682",
  api_secret: process.env.CLOUDINARY_API_SECRET || "xajVXWhxlcJzGbjacBPJIbYR6R8",
  secure: true,
});

export default cloudinary;
