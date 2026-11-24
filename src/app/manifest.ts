import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nathora Technologies",
    short_name: "Nathora",
    description: "Web, mobile apps, software & cloud. Send enquiries and chat with the Nathora team.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070E22",
    theme_color: "#0B1530",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New enquiry", url: "/dashboard/enquiries/new" },
      { name: "My enquiries", url: "/dashboard/enquiries" },
    ],
  };
}
