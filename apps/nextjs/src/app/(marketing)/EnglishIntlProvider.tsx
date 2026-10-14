"use client";

import { NextIntlClientProvider } from "next-intl";

import { messages } from "@flatsby/i18n/messages";

// The client provider never reads request config, so marketing stays static.
export function EnglishIntlProvider(props: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages.en}>
      {props.children}
    </NextIntlClientProvider>
  );
}
