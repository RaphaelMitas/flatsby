export const locales = ["en", "de"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

export const localeCookie = "locale";

// English keeps the unprefixed URLs it had before German existed.
export function localePath(locale: Locale, path: string) {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function matchLocale(languageTags: readonly string[]): Locale {
  for (const tag of languageTags) {
    const language = tag.split("-")[0]?.trim().toLowerCase() ?? "";
    if (isLocale(language)) return language;
  }
  return defaultLocale;
}

// Browsers and the Expo client already list tags in preference order.
export function resolveLocale(
  preference: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (preference && isLocale(preference)) return preference;
  return matchLocale(
    acceptLanguage?.split(",").map((part) => part.split(";")[0] ?? "") ?? [],
  );
}

export function localeFromHeaders(headers: {
  get(name: string): string | null;
}): Locale {
  const preference = headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === localeCookie)?.[1];
  return resolveLocale(preference, headers.get("accept-language"));
}
