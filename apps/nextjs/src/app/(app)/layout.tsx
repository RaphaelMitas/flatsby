import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { parsePalette } from "@flatsby/validators/palette";

import { NavBeacon } from "~/app/_components/analytics/NavBeacon";
import {
  PALETTE_STYLE_ID,
  paletteCookie,
  rootPaletteCss,
} from "~/app/_components/layout/palette";
import {
  rootMetadata,
  RootShell,
  rootViewport,
} from "~/app/_components/RootShell";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default async function AppLayout(props: { children: React.ReactNode }) {
  const { marketing, legal, ...messages } = await getMessages();
  const palette = parsePalette(
    (await cookies()).get(paletteCookie)?.value ?? null,
  );
  return (
    <RootShell
      lang={await getLocale()}
      head={<style id={PALETTE_STYLE_ID}>{rootPaletteCss(palette)}</style>}
    >
      <NavBeacon entryPagesOnly />
      <NextIntlClientProvider messages={messages}>
        {props.children}
      </NextIntlClientProvider>
    </RootShell>
  );
}
