import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import type { LocaleParams } from "~/app/_components/landing/i18n";
import { routeLocale } from "~/app/_components/landing/i18n";
import {
  LegalHeading,
  LegalItems,
  LegalParagraph,
  LegalSection,
  LegalTableOfContents,
  strong,
} from "../_components/legal-content";
import { legalMetadata, LegalShell } from "../_components/legal-shell";

export const dynamicParams = false;

const PATH = "/legal/terms";
const TERMS_VERSION = "1.0";

const SECTIONS = [
  "acceptance",
  "description",
  "accounts",
  "conduct",
  "content",
  "termination",
  "disclaimer",
  "liability",
  "changes",
  "contact",
] as const;

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const locale = await routeLocale(props);
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  return legalMetadata(locale, PATH, {
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default function TermsPage() {
  const legal = useTranslations("legal");
  const t = useTranslations("legal.terms");
  const heading = (key: (typeof SECTIONS)[number]) =>
    `${SECTIONS.indexOf(key) + 1}. ${t(`toc.${key}`)}`;

  return (
    <LegalShell path={PATH}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {legal("version", {
              version: TERMS_VERSION,
              date: t("lastUpdated"),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LegalTableOfContents
            title={legal("tableOfContents")}
            items={SECTIONS.map((id) => ({ id, label: t(`toc.${id}`) }))}
          />

          <LegalSection id="acceptance">
            <LegalHeading>{heading("acceptance")}</LegalHeading>
            <LegalParagraph>{t("acceptance")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="description">
            <LegalHeading>{heading("description")}</LegalHeading>
            <LegalParagraph>{t("description.intro")}</LegalParagraph>
            <LegalItems
              keys={["lists", "expenses", "groups", "ai"] as const}
              render={(key) => t(`description.${key}`)}
            />
          </LegalSection>

          <LegalSection id="accounts">
            <LegalHeading>{heading("accounts")}</LegalHeading>
            <LegalParagraph>{t("accounts.intro")}</LegalParagraph>
            <LegalItems
              keys={["security", "activities", "notify"] as const}
              render={(key) => t(`accounts.${key}`)}
            />
            <LegalParagraph>{t("accounts.age")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="conduct">
            <LegalHeading>{heading("conduct")}</LegalHeading>
            <LegalParagraph>{t("conduct.intro")}</LegalParagraph>
            <LegalItems
              keys={
                [
                  "unlawful",
                  "harass",
                  "access",
                  "malware",
                  "disrupt",
                  "privacy",
                ] as const
              }
              render={(key) => t(`conduct.${key}`)}
            />
          </LegalSection>

          <LegalSection id="content">
            <LegalHeading>{heading("content")}</LegalHeading>
            <LegalParagraph>{t("content.license")}</LegalParagraph>
            <LegalParagraph>{t("content.responsibility")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="termination">
            <LegalHeading>{heading("termination")}</LegalHeading>
            <LegalParagraph>{t("termination.delete")}</LegalParagraph>
            <LegalParagraph>{t("termination.effect")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="disclaimer">
            <LegalHeading>{heading("disclaimer")}</LegalHeading>
            <LegalParagraph>{t("disclaimer")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="liability">
            <LegalHeading>{heading("liability")}</LegalHeading>
            <LegalParagraph>{t("liability")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="changes">
            <LegalHeading>{heading("changes")}</LegalHeading>
            <LegalParagraph>{t("changes")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="contact">
            <LegalHeading>{heading("contact")}</LegalHeading>
            <LegalParagraph>{t("contact.intro")}</LegalParagraph>
            <LegalParagraph>
              {t.rich("contact.email", { strong })}
            </LegalParagraph>
          </LegalSection>
        </CardContent>
      </Card>
    </LegalShell>
  );
}
