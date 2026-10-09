import type { MetadataRoute } from "next";

import { SITE_URL } from "./_components/landing/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/billing",
        "/chat",
        "/expenses",
        "/group",
        "/home",
        "/md",
        "/shopping-list",
        "/user-settings",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
