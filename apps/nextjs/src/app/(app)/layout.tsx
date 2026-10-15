import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import {
  rootMetadata,
  RootShell,
  rootViewport,
} from "~/app/_components/RootShell";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default async function AppLayout(props: { children: React.ReactNode }) {
  // No route under (app) renders marketing or legal text.
  const { marketing, legal, ...messages } = await getMessages();
  return (
    <RootShell lang={await getLocale()}>
      <NextIntlClientProvider messages={messages}>
        {props.children}
      </NextIntlClientProvider>
    </RootShell>
  );
}
