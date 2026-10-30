import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trybe — fun experiences for families",
    short_name: "Trybe",
    description:
      "Discover fun-filled experiences, activities and events that bring children and families together.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#62358c",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
