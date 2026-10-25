import type { MetadataRoute } from "next";

import { PLAY_STORE_ID } from "@flatsby/validators/store";

import { PLAY_STORE_URL } from "./_components/landing/content";

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
    // Chrome on Android offers the Play app instead of installing this site as a PWA.
    prefer_related_applications: true,
    related_applications: [
      { platform: "play", url: PLAY_STORE_URL, id: PLAY_STORE_ID },
    ],
  };
}
