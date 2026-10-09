import type { MetadataRoute } from "next";

import { LEGAL_PAGES, SITE_URL } from "./_components/landing/content";
import { CONTENT_PAGES } from "./_components/landing/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    ...CONTENT_PAGES.map((page) => ({ url: `${SITE_URL}/${page.slug}` })),
    ...LEGAL_PAGES.map((page) => ({ url: `${SITE_URL}${page.path}` })),
  ];
}
