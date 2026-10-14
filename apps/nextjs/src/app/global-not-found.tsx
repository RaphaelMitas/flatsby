import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { NotFoundMessage } from "./_components/landing/NotFoundMessage";
import { rootMetadata, RootShell, rootViewport } from "./_components/RootShell";

export const viewport = rootViewport;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound");
  return { ...rootMetadata, title: t("metaTitle") };
}

export default async function GlobalNotFound() {
  return (
    <RootShell lang={await getLocale()}>
      <NotFoundMessage />
    </RootShell>
  );
}
