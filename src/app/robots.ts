import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://theblingcorner.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/vendor",
        "/vendor/*",
        "/account",
        "/account/*",
        "/api/*",
        "/checkout",
        "/checkout/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

