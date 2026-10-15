import type { Locale } from "@flatsby/i18n/locale";
import type { Metadata } from "next";

import { defaultLocale, localePath } from "@flatsby/i18n/locale";

import { localeAlternates } from "./i18n";

export function marketingMetadata({
  locale,
  title,
  description,
  path,
  markdownPath,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  markdownPath: string;
}): Metadata {
  const url = localePath(locale, path);
  return {
    title,
    description,
    robots: "index,follow",
    alternates: {
      canonical: url,
      languages: localeAlternates(path),
      // The markdown twins exist in English only.
      ...(locale === defaultLocale && {
        types: { "text/markdown": markdownPath },
      }),
    },
    openGraph: {
      type: "website",
      siteName: "Flatsby",
      url,
      title,
      description,
      images: "/opengraph-image",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: "/opengraph-image",
    },
  };
}
