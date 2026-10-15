import type { MessageKeys, NestedKeyOf, TranslationValues } from "use-intl";

import type { Messages } from "./messages";

export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

export type Translate = (key: MessageKey, values?: TranslationValues) => string;

// Validators and the API store keys instead of text; the screen translates them.
export function msg<Key extends MessageKey>(key: Key): Key {
  return key;
}

// Takes the translator rather than the catalog so client bundles never pull in every locale.
type KeyTranslator = Translate & { has(key: string): boolean };

function isMessageKey(t: KeyTranslator, text: string): text is MessageKey {
  return t.has(text);
}

export function translateIfKey(t: KeyTranslator, text: string): string {
  return isMessageKey(t, text) ? t(text) : text;
}
