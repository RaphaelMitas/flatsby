import type { MetadataRoute } from "next";

import { localePath, locales } from "@flatsby/i18n/locale";

import { LEGAL_PAGES, SITE_URL } from "./_components/landing/content";
import { localeAlternates } from "./_components/landing/i18n";
import { CONTENT_SLUGS } from "./_components/landing/pages";

const PATHS = [
  "/",
  ...CONTENT_SLUGS.map((slug) => `/${slug}`),
  ...LEGAL_PAGES.map((page) => page.path),
];

function absolute(path: string) {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap((path) => {
    const languages = Object.fromEntries(
      Object.entries(localeAlternates(path)).map(([lang, href]) => [
        lang,
        absolute(href),
      ]),
    );
    return locales.map((locale) => ({
      url: absolute(localePath(locale, path)),
      alternates: { languages },
    }));
  });
}
