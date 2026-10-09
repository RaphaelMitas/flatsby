import type { MetadataRoute } from "next";

import { SITE_URL } from "./_components/landing/content";
import { CONTENT_PAGES } from "./_components/landing/pages";

const LEGAL = ["legal/terms", "legal/privacy", "legal/legal-notice"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    ...CONTENT_PAGES.map((page) => ({ url: `${SITE_URL}/${page.slug}` })),
    ...LEGAL.map((path) => ({ url: `${SITE_URL}/${path}` })),
  ];
}
