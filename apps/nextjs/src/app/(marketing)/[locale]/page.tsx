import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isLocale } from "@flatsby/i18n/locale";

import type { LocaleParams } from "~/app/_components/landing/i18n";
import {
  marketingTranslator,
  routeLocale,
} from "~/app/_components/landing/i18n";
import { LandingPage } from "~/app/_components/landing/LandingPage";
import { marketingMetadata } from "~/app/_components/landing/metadata";
import { getPlatform } from "~/app/_components/landing/platform";
import { getSession, signOutAndRedirect } from "~/auth/server";
import { caller } from "~/trpc/server";

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = marketingTranslator(locale);
  return marketingMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/",
    markdownPath: "/index.md",
  });
}

export default async function HomePage(props: LocaleParams) {
  const locale = await routeLocale(props);
  const session = await getSession();

  if (!session?.user) {
    return <LandingPage locale={locale} platform={await getPlatform()} />;
  }

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success) {
    if (userWithGroups.error.type === "UnauthorizedError") {
      return signOutAndRedirect();
    }
    throw new Error(userWithGroups.error.message);
  }

  if (userWithGroups.data.groups.length > 0) {
    redirect("/home");
  } else {
    redirect("/group");
  }
}
