import type { MessageKeys, NestedKeyOf, TranslationValues } from "use-intl";

import type { Messages } from "./messages";
import { messages } from "./messages";

export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

export type Translate = (key: MessageKey, values?: TranslationValues) => string;

// Validators and the API store keys instead of text; the screen translates them.
export function msg<Key extends MessageKey>(key: Key): Key {
  return key;
}

function leafKeys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    if (typeof value === "string") return [`${prefix}${key}`];
    return typeof value === "object" && value !== null
      ? leafKeys(value, `${prefix}${key}.`)
      : [];
  });
}

const messageKeys = new Set(leafKeys(messages.en));

export function isMessageKey(value: string): value is MessageKey {
  return messageKeys.has(value);
}

export function translateIfKey(t: Translate, text: string): string {
  return isMessageKey(text) ? t(text) : text;
}
