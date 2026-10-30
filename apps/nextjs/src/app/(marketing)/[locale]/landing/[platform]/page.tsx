import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  marketingTranslator,
  routeLocale,
} from "~/app/_components/landing/i18n";
import { LandingPage } from "~/app/_components/landing/LandingPage";
import { marketingMetadata } from "~/app/_components/landing/metadata";
import { isPlatform, platforms } from "~/app/_components/landing/platform";

interface Props {
  params: Promise<{ locale: string; platform: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return platforms.map((platform) => ({ platform }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = await routeLocale(props);
  const t = marketingTranslator(locale);
  return marketingMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/",
    markdownPath: "/index.md",
  });
}

export default async function HomePage(props: Props) {
  const locale = await routeLocale(props);
  const { platform } = await props.params;
  if (!isPlatform(platform)) notFound();
  return <LandingPage locale={locale} platform={platform} />;
}
