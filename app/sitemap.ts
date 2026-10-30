import type { MetadataRoute } from "next";

const BASE_URL = "https://trybe.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE_URL, lastModified, changeFrequency: "weekly", priority: 1.0 },
    {
      url: `${BASE_URL}/studio-stars`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/studio-stars/book`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
