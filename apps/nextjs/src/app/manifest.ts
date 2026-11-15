import type { MetadataRoute } from "next";

import { PLAY_STORE_ID, PLAY_STORE_URL } from "@flatsby/validators/store";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flatsby",
    short_name: "Flatsby",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#000000",
    display: "standalone",
    prefer_related_applications: true,
    related_applications: [
      { platform: "play", url: PLAY_STORE_URL, id: PLAY_STORE_ID },
    ],
  };
}
