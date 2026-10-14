import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import {
  rootMetadata,
  RootShell,
  rootViewport,
} from "~/app/_components/RootShell";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default async function AppLayout(props: { children: React.ReactNode }) {
  return (
    <RootShell lang={await getLocale()}>
      <NextIntlClientProvider>{props.children}</NextIntlClientProvider>
    </RootShell>
  );
}
