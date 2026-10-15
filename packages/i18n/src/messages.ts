// The augmentation below can only find use-intl once this file imports it.
import type {} from "use-intl";

import type { Locale } from "./locale";
import { de } from "./messages/de";
import { en } from "./messages/en";

export type Messages = typeof en;

export const messages = { en, de } satisfies Record<Locale, Messages>;

declare module "use-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
