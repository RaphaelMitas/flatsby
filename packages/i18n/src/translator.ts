import { createTranslator } from "use-intl/core";

import type { Locale } from "./locale";
import { messages } from "./messages";

export function translatorFor(locale: Locale) {
  return createTranslator({ locale, messages: messages[locale] });
}
