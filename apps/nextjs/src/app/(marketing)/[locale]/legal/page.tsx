import type { Metadata } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { localePath } from "@flatsby/i18n/locale";
import { Card, CardDescription, CardHeader, CardTitle } from "@flatsby/ui/card";

import type { LocaleParams } from "~/app/_components/landing/i18n";
import { LEGAL_PAGES } from "~/app/_components/landing/content";
import { routeLocale } from "~/app/_components/landing/i18n";
import { legalMetadata, LegalShell } from "./_components/legal-shell";

export const dynamicParams = false;

const PATH = "/legal";

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const locale = await routeLocale(props);
  const t = await getTranslations({ locale, namespace: "legal.index" });
  return legalMetadata(locale, PATH, {
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default function LegalPage() {
  const locale = useLocale();
  const t = useTranslations("legal");

  return (
    <LegalShell path={PATH}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("index.heading")}</h1>
          <p className="text-muted-foreground mt-2">{t("index.intro")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {LEGAL_PAGES.map((document) => (
            <Link key={document.id} href={localePath(locale, document.path)}>
              <Card className="h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                <CardHeader>
                  <CardTitle>{t(`${document.id}.title`)}</CardTitle>
                  <CardDescription>{t(`index.${document.id}`)}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </LegalShell>
  );
}
