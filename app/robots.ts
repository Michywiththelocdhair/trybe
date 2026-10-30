import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/preview",
        "/studio-stars/book/booking-confirmation",
      ],
    },
    sitemap: "https://trybe.uk/sitemap.xml",
  };
}
