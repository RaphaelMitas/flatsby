import type { Locale } from "@flatsby/i18n/locale";
import * as WebBrowser from "expo-web-browser";

import { localePath } from "@flatsby/i18n/locale";

import { getBaseUrl } from "./base-url";

export function openLegalPage(
  locale: Locale,
  page: "terms" | "privacy" | "legal-notice",
) {
  // Rejects in Apple's review sandbox and on rapid repeat taps; nothing to tell the user.
  WebBrowser.openBrowserAsync(
    `${getBaseUrl()}${localePath(locale, `/legal/${page}`)}`,
  ).catch(() => undefined);
}
