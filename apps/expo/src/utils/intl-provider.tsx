import type { Locale } from "@flatsby/i18n/locale";
import { createContext, useContext, useState } from "react";
import { getLocales, useLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { IntlProvider as UseIntlProvider } from "use-intl";

import { isLocale, matchLocale } from "@flatsby/i18n/locale";
import { messages } from "@flatsby/i18n/messages";

const PREFERENCE_KEY = "locale_preference";

// Read synchronously so the first frame is already in the chosen language.
let preference = readPreference();

function readPreference() {
  const saved = SecureStore.getItem(PREFERENCE_KEY);
  return saved && isLocale(saved) ? saved : null;
}

// The API takes the first supported tag, so the app's choice goes first.
export function languageTags() {
  const device = getLocales().map((l) => l.languageTag);
  return preference ? [preference, ...device] : device;
}

const LocalePreferenceContext = createContext<{
  preference: Locale | null;
  setPreference: (next: Locale | null) => void;
} | null>(null);

// useLocales re-renders when Android switches language without restarting the app.
export function IntlProvider(props: { children: React.ReactNode }) {
  const [current, setCurrent] = useState(preference);
  const deviceLocale = matchLocale(useLocales().map((l) => l.languageTag));
  const locale = current ?? deviceLocale;

  const setPreference = (next: Locale | null) => {
    preference = next;
    if (next) SecureStore.setItem(PREFERENCE_KEY, next);
    else void SecureStore.deleteItemAsync(PREFERENCE_KEY);
    setCurrent(next);
  };

  return (
    <LocalePreferenceContext.Provider
      value={{ preference: current, setPreference }}
    >
      <UseIntlProvider locale={locale} messages={messages[locale]}>
        {props.children}
      </UseIntlProvider>
    </LocalePreferenceContext.Provider>
  );
}

export function useLocalePreference() {
  const context = useContext(LocalePreferenceContext);
  if (!context) {
    throw new Error("useLocalePreference must be used within IntlProvider");
  }
  return context;
}
