import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { locales } from "@flatsby/i18n/locale";

import {
  rootMetadata,
  RootShell,
  rootViewport,
} from "~/app/_components/RootShell";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function MarketingLayout(props: {
  children: React.ReactNode;
}) {
  return (
    <RootShell lang={await getLocale()}>
      <NextIntlClientProvider>{props.children}</NextIntlClientProvider>
    </RootShell>
  );
}
