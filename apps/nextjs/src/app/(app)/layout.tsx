import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { NavBeacon } from "~/app/_components/analytics/NavBeacon";
import { paletteScript } from "~/app/_components/layout/palette";
import { PaletteSync } from "~/app/_components/layout/palette-sync";
import {
  rootMetadata,
  RootShell,
  rootViewport,
} from "~/app/_components/RootShell";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default async function AppLayout(props: { children: React.ReactNode }) {
  const { marketing, legal, ...messages } = await getMessages();
  return (
    <RootShell
      lang={await getLocale()}
      head={
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static script that applies the stored palette before first paint
          dangerouslySetInnerHTML={{ __html: paletteScript }}
        />
      }
    >
      <PaletteSync />
      <NavBeacon entryPagesOnly />
      <NextIntlClientProvider messages={messages}>
        {props.children}
      </NextIntlClientProvider>
    </RootShell>
  );
}
