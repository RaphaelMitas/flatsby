import type { Locale } from "@flatsby/i18n/locale";
import { notFound } from "next/navigation";
import { createTranslator } from "next-intl";

import { isLocale, localePath, locales } from "@flatsby/i18n/locale";
import { messages } from "@flatsby/i18n/messages";

export function marketingTranslator(locale: Locale) {
  return createTranslator({
    locale,
    messages: messages[locale],
    namespace: "marketing",
  });
}

export type MarketingTranslator = ReturnType<typeof marketingTranslator>;

export function localeAlternates(path: string) {
  return {
    ...Object.fromEntries(
      locales.map((locale) => [locale, localePath(locale, path)]),
    ),
    "x-default": path,
  };
}

export interface LocaleParams {
  params: Promise<{ locale: string }>;
}

export async function routeLocale({ params }: LocaleParams): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
