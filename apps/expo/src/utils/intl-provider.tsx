import { useLocales } from "expo-localization";
import { IntlProvider as UseIntlProvider } from "use-intl";

import { matchLocale } from "@flatsby/i18n/locale";
import { messages } from "@flatsby/i18n/messages";

// useLocales re-renders when Android switches language without restarting the app.
export function IntlProvider(props: { children: React.ReactNode }) {
  const locale = matchLocale(useLocales().map((l) => l.languageTag));
  return (
    <UseIntlProvider locale={locale} messages={messages[locale]}>
      {props.children}
    </UseIntlProvider>
  );
}
