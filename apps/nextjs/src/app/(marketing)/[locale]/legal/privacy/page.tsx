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
  LegalLink,
  LegalList,
  LegalParagraph,
  LegalSection,
  LegalSubheading,
  LegalTableOfContents,
  OperatorAddress,
  strong,
} from "../_components/legal-content";
import { legalMetadata, LegalShell } from "../_components/legal-shell";

export const dynamicParams = false;

const PATH = "/legal/privacy";
const PRIVACY_VERSION = "1.4";

const SECTIONS = [
  { id: "data-controller", key: "controller" },
  { id: "data-collected", key: "collected" },
  { id: "legal-basis", key: "basis" },
  { id: "data-sharing", key: "sharing" },
  { id: "data-retention", key: "retention" },
  { id: "your-rights", key: "rights" },
  { id: "objection", key: "objection" },
  { id: "international", key: "international" },
  { id: "children", key: "children" },
  { id: "changes", key: "changes" },
] as const;

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const locale = await routeLocale(props);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return legalMetadata(locale, PATH, {
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default function PrivacyPage() {
  const legal = useTranslations("legal");
  const t = useTranslations("legal.privacy");
  const heading = (key: (typeof SECTIONS)[number]["key"]) =>
    `${SECTIONS.findIndex((section) => section.key === key) + 1}. ${t(`toc.${key}`)}`;

  return (
    <LegalShell path={PATH}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {legal("version", {
              version: PRIVACY_VERSION,
              date: t("lastUpdated"),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LegalTableOfContents
            title={legal("tableOfContents")}
            items={SECTIONS.map(({ id, key }) => ({
              id,
              label: t(`toc.${key}`),
            }))}
          />

          <LegalSection id="data-controller">
            <LegalHeading>{heading("controller")}</LegalHeading>
            <LegalParagraph>{t("controller")}</LegalParagraph>
            <OperatorAddress lines={[t("city"), t("emailLine")]} />
          </LegalSection>

          <LegalSection id="data-collected">
            <LegalHeading>{heading("collected")}</LegalHeading>

            <LegalSubheading>{t("account.heading")}</LegalSubheading>
            <LegalParagraph>{t("account.intro")}</LegalParagraph>
            <LegalItems
              keys={
                [
                  "name",
                  "email",
                  "picture",
                  "identifier",
                  "plan",
                  "payment",
                ] as const
              }
              render={(key) => t(`account.${key}`)}
            />

            <LegalSubheading>{t("userContent.heading")}</LegalSubheading>
            <LegalParagraph>{t("userContent.intro")}</LegalParagraph>
            <LegalItems
              keys={
                ["lists", "expenses", "calendar", "groups", "chat"] as const
              }
              render={(key) => t(`userContent.${key}`)}
            />

            <LegalSubheading>{t("technical.heading")}</LegalSubheading>
            <LegalParagraph>{t("technical.intro")}</LegalParagraph>
            <LegalParagraph>
              <strong>{t("technical.website")}</strong>
            </LegalParagraph>
            <LegalItems
              keys={["websiteIp", "websiteViews", "websiteSession"] as const}
              render={(key) => t(`technical.${key}`)}
            />
            <LegalParagraph>
              <strong>{t("technical.mobile")}</strong>
            </LegalParagraph>
            <LegalItems
              keys={["mobileIp", "mobileDevice", "mobileViews"] as const}
              render={(key) => t(`technical.${key}`)}
            />
            <LegalParagraph>{t("technical.errors")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="legal-basis">
            <LegalHeading>{heading("basis")}</LegalHeading>
            <LegalItems
              keys={
                ["contract", "consent", "interests", "obligations"] as const
              }
              render={(key) => t.rich(`basis.${key}`, { strong })}
            />
            <LegalParagraph>{t("basis.required")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="data-sharing">
            <LegalHeading>{heading("sharing")}</LegalHeading>

            <LegalSubheading>{t("groups.heading")}</LegalSubheading>
            <LegalParagraph>{t("groups.body")}</LegalParagraph>

            <LegalSubheading>{t("providers.heading")}</LegalSubheading>
            <LegalList>
              <li>{t.rich("providers.neon", { strong })}</li>
              <li>{t.rich("providers.vercel", { strong })}</li>
              <li>{t.rich("providers.auth", { strong })}</li>
              <li>{t.rich("providers.billing", { strong })}</li>
              <li>{t.rich("providers.expo", { strong })}</li>
              <li>{t.rich("providers.stores", { strong })}</li>
              <li>
                {t.rich("providers.ai", {
                  strong,
                  gateway: (chunks) => (
                    <LegalLink
                      href="https://vercel.com/docs/ai-gateway"
                      external
                    >
                      {chunks}
                    </LegalLink>
                  ),
                  dpa: (chunks) => (
                    <LegalLink
                      href="https://vercel.com/legal/privacy-policy"
                      external
                    >
                      {chunks}
                    </LegalLink>
                  ),
                })}
              </li>
              <li id="analytics" className="scroll-mt-24">
                {t.rich("providers.posthog", { strong })}
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>{t.rich("providers.posthogWebsite", { strong })}</li>
                  <li>{t.rich("providers.posthogServer", { strong })}</li>
                  <li>{t.rich("providers.posthogMobile", { strong })}</li>
                </ul>
                {t.rich("providers.posthogAi", {
                  link: (chunks) => (
                    <LegalLink href="https://posthog.com/privacy" external>
                      {chunks}
                    </LegalLink>
                  ),
                })}
              </li>
            </LegalList>
          </LegalSection>

          <LegalSection id="data-retention">
            <LegalHeading>{heading("retention")}</LegalHeading>
            <LegalParagraph>{t("retention.intro")}</LegalParagraph>
            <LegalItems
              keys={["personal", "content"] as const}
              render={(key) => t(`retention.${key}`)}
            />
            <LegalParagraph>{t("retention.outro")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="your-rights">
            <LegalHeading>{heading("rights")}</LegalHeading>
            <LegalItems
              keys={
                [
                  "access",
                  "rectification",
                  "erasure",
                  "restriction",
                  "portability",
                  "object",
                  "withdraw",
                ] as const
              }
              render={(key) => t.rich(`rights.${key}`, { strong })}
            />
            <LegalParagraph>
              {t.rich("rights.exercise", {
                link: (chunks) => (
                  <LegalLink href="https://datenschutz.hessen.de" external>
                    {chunks}
                  </LegalLink>
                ),
              })}
            </LegalParagraph>
          </LegalSection>

          <LegalSection id="objection">
            <LegalHeading>{heading("objection")}</LegalHeading>
            <LegalParagraph>
              <strong>{t("objection.intro")}</strong>
            </LegalParagraph>
            <LegalItems
              keys={["signedIn", "visitor"] as const}
              render={(key) => t.rich(`objection.${key}`, { strong })}
            />
          </LegalSection>

          <LegalSection id="international">
            <LegalHeading>{heading("international")}</LegalHeading>
            <LegalParagraph>{t("international")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="children">
            <LegalHeading>{heading("children")}</LegalHeading>
            <LegalParagraph>{t("children")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="changes">
            <LegalHeading>{heading("changes")}</LegalHeading>
            <LegalParagraph>{t("changes")}</LegalParagraph>
          </LegalSection>
        </CardContent>
      </Card>
    </LegalShell>
  );
}
