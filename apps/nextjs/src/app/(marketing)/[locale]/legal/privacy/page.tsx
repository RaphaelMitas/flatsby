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
const PRIVACY_VERSION = "1.2";

const SECTIONS = [
  { id: "introduction", key: "introduction" },
  { id: "data-controller", key: "controller" },
  { id: "data-collected", key: "collected" },
  { id: "legal-basis", key: "basis" },
  { id: "data-use", key: "use" },
  { id: "data-sharing", key: "sharing" },
  { id: "data-retention", key: "retention" },
  { id: "your-rights", key: "rights" },
  { id: "security", key: "security" },
  { id: "international", key: "international" },
  { id: "children", key: "children" },
  { id: "changes", key: "changes" },
  { id: "contact", key: "contact" },
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

          <LegalSection id="introduction">
            <LegalHeading>{heading("introduction")}</LegalHeading>
            <LegalParagraph>{t("introduction")}</LegalParagraph>
          </LegalSection>

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
              keys={["name", "email", "picture", "identifier"] as const}
              render={(key) => t(`account.${key}`)}
            />

            <LegalSubheading>{t("userContent.heading")}</LegalSubheading>
            <LegalParagraph>{t("userContent.intro")}</LegalParagraph>
            <LegalItems
              keys={["lists", "expenses", "groups", "chat"] as const}
              render={(key) => t(`userContent.${key}`)}
            />

            <LegalSubheading>{t("technical.heading")}</LegalSubheading>
            <LegalParagraph>{t("technical.intro")}</LegalParagraph>
            <LegalParagraph>
              <strong>{t("technical.website")}</strong>
            </LegalParagraph>
            <LegalItems
              keys={["websiteIp", "websiteViews"] as const}
              render={(key) => t(`technical.${key}`)}
            />
            <LegalParagraph>
              <strong>{t("technical.mobile")}</strong>
            </LegalParagraph>
            <LegalItems
              keys={["mobileIp", "mobileDevice", "mobileViews"] as const}
              render={(key) => t(`technical.${key}`)}
            />
          </LegalSection>

          <LegalSection id="legal-basis">
            <LegalHeading>{heading("basis")}</LegalHeading>
            <LegalParagraph>{t("basis.intro")}</LegalParagraph>
            <LegalItems
              keys={
                ["contract", "consent", "interests", "obligations"] as const
              }
              render={(key) => t.rich(`basis.${key}`, { strong })}
            />
          </LegalSection>

          <LegalSection id="data-use">
            <LegalHeading>{heading("use")}</LegalHeading>
            <LegalParagraph>{t("use.intro")}</LegalParagraph>
            <LegalItems
              keys={
                [
                  "provide",
                  "collaborate",
                  "display",
                  "ai",
                  "communications",
                  "improve",
                  "security",
                ] as const
              }
              render={(key) => t(`use.${key}`)}
            />
          </LegalSection>

          <LegalSection id="data-sharing">
            <LegalHeading>{heading("sharing")}</LegalHeading>

            <LegalSubheading>{t("groups.heading")}</LegalSubheading>
            <LegalParagraph>{t("groups.body")}</LegalParagraph>

            <LegalSubheading>{t("providers.heading")}</LegalSubheading>
            <LegalParagraph>{t("providers.intro")}</LegalParagraph>
            <LegalList>
              <li>{t.rich("providers.neon", { strong })}</li>
              <li>{t.rich("providers.vercel", { strong })}</li>
              <li>{t.rich("providers.auth", { strong })}</li>
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
                    <LegalLink href="https://vercel.com/legal/dpa" external>
                      {chunks}
                    </LegalLink>
                  ),
                })}
              </li>
              <li>
                {t.rich("providers.posthog", { strong })}
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>{t.rich("providers.posthogWebsite", { strong })}</li>
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

            <LegalSubheading>{t("legalRequirements.heading")}</LegalSubheading>
            <LegalParagraph>{t("legalRequirements.body")}</LegalParagraph>

            <LegalSubheading>{t("aiProcessing.heading")}</LegalSubheading>
            <LegalParagraph>{t("aiProcessing.intro")}</LegalParagraph>
            <LegalItems
              keys={["names", "chat", "data", "members"] as const}
              render={(key) => t(`aiProcessing.${key}`)}
            />
            <LegalParagraph>{t("aiProcessing.outro")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="data-retention">
            <LegalHeading>{heading("retention")}</LegalHeading>
            <LegalParagraph>{t("retention.intro")}</LegalParagraph>
            <LegalItems
              keys={["personal", "content", "chat"] as const}
              render={(key) => t(`retention.${key}`)}
            />
            <LegalParagraph>{t("retention.outro")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="your-rights">
            <LegalHeading>{heading("rights")}</LegalHeading>
            <LegalParagraph>{t("rights.intro")}</LegalParagraph>
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
              {t.rich("rights.optOut", { strong })}
            </LegalParagraph>
            <LegalParagraph>{t("rights.exercise")}</LegalParagraph>
          </LegalSection>

          <LegalSection id="security">
            <LegalHeading>{heading("security")}</LegalHeading>
            <LegalParagraph>{t("security.intro")}</LegalParagraph>
            <LegalItems
              keys={
                ["transit", "rest", "oauth", "assessments", "access"] as const
              }
              render={(key) => t(`security.${key}`)}
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

          <LegalSection id="contact">
            <LegalHeading>{heading("contact")}</LegalHeading>
            <LegalParagraph>{t("contact.intro")}</LegalParagraph>
            <LegalParagraph>
              {t.rich("contact.email", { strong })}
            </LegalParagraph>
            <OperatorAddress lines={[t("city")]} />
          </LegalSection>
        </CardContent>
      </Card>
    </LegalShell>
  );
}
