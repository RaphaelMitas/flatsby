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
  LegalLink,
  LegalParagraph,
  LegalSection,
  OperatorAddress,
  strong,
} from "../_components/legal-content";
import { legalMetadata, LegalShell } from "../_components/legal-shell";

export const dynamicParams = false;

const PATH = "/legal/legal-notice";

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const locale = await routeLocale(props);
  const t = await getTranslations({ locale, namespace: "legal.legalNotice" });
  return legalMetadata(locale, PATH, {
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default function LegalNoticePage() {
  const t = useTranslations("legal.legalNotice");
  const addressLines = ["64291 Darmstadt", t("country")];

  return (
    <LegalShell path={PATH}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LegalSection>
            <LegalHeading>{t("provider")}</LegalHeading>
            <OperatorAddress lines={addressLines} />
          </LegalSection>

          <LegalSection>
            <LegalHeading>{t("contact.heading")}</LegalHeading>
            <LegalParagraph>
              {t.rich("contact.phone", { strong })}
            </LegalParagraph>
            <LegalParagraph>
              {t.rich("contact.email", {
                strong,
                link: (chunks) => (
                  <LegalLink href="mailto:support@flatsby.com">
                    {chunks}
                  </LegalLink>
                ),
              })}
            </LegalParagraph>
          </LegalSection>

          <LegalSection>
            <LegalHeading>{t("responsible.heading")}</LegalHeading>
            <LegalParagraph>{t("responsible.body")}</LegalParagraph>
            <OperatorAddress lines={addressLines} />
          </LegalSection>

          <LegalSection>
            <LegalHeading>{t("dispute.heading")}</LegalHeading>
            <LegalParagraph>{t("dispute.body")}</LegalParagraph>
          </LegalSection>

          <LegalSection>
            <LegalHeading>{t("contentLiability.heading")}</LegalHeading>
            <LegalParagraph>{t("contentLiability.own")}</LegalParagraph>
            <LegalParagraph>{t("contentLiability.removal")}</LegalParagraph>
          </LegalSection>

          <LegalSection>
            <LegalHeading>{t("linkLiability.heading")}</LegalHeading>
            <LegalParagraph>{t("linkLiability.external")}</LegalParagraph>
            <LegalParagraph>{t("linkLiability.control")}</LegalParagraph>
          </LegalSection>

          <LegalSection>
            <LegalHeading>{t("copyright.heading")}</LegalHeading>
            <LegalParagraph>{t("copyright.works")}</LegalParagraph>
            <LegalParagraph>{t("copyright.thirdParty")}</LegalParagraph>
          </LegalSection>
        </CardContent>
      </Card>
    </LegalShell>
  );
}
