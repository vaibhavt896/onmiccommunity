import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "On Mic Community",
    short_name: "On Mic",
    description: "Open mic and jam nights in Kanpur.",
    start_url: "/",
    display: "standalone",
    theme_color: "#0d0616",
    background_color: "#0d0616",
    icons: [
      { src: "/brand/icons/onmic-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icons/onmic-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icons/onmic-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
