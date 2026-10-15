import type { Locale } from "@flatsby/i18n/locale";

import { localePath } from "@flatsby/i18n/locale";

import type { FaqItem } from "./content";
import type { ContentPageData } from "./pages";
import {
  APP_STORE_URL,
  FEATURES,
  GITHUB_URL,
  PLAY_STORE_URL,
  SITE_URL,
  UPDATED,
} from "./content";
import { marketingTranslator } from "./i18n";

const ORG_ID = `${SITE_URL}/#org`;

function faqPage(items: readonly FaqItem[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      // i18n-ignore
      "@type": "Question",
      name: item.question,
      // i18n-ignore
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function homeJsonLd(locale: Locale, faq: readonly FaqItem[]) {
  const t = marketingTranslator(locale);
  return [
    {
      // i18n-ignore
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Flatsby",
      url: SITE_URL,
      logo: `${SITE_URL}/web-app-manifest-512x512.png`,
      sameAs: [APP_STORE_URL, PLAY_STORE_URL, GITHUB_URL],
      // i18n-ignore
      founder: { "@type": "Person", name: "Raphael Mitas" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Flatsby",
      url: SITE_URL,
      inLanguage: locale,
      applicationCategory: "LifestyleApplication",
      // i18n-ignore
      operatingSystem: "Web, iOS, Android",
      description: t("description"),
      publisher: { "@id": ORG_ID },
      // i18n-ignore
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      installUrl: [APP_STORE_URL, PLAY_STORE_URL],
      license: "https://opensource.org/licenses/MIT",
      featureList: FEATURES.map((feature) => t(`features.${feature}.title`)),
    },
    faqPage(faq),
  ];
}

export function contentPageJsonLd(locale: Locale, page: ContentPageData) {
  return [
    {
      "@type": "WebPage",
      url: `${SITE_URL}${localePath(locale, `/${page.slug}`)}`,
      inLanguage: locale,
      name: page.title,
      description: page.description,
      dateModified: UPDATED,
      // i18n-ignore
      publisher: { "@type": "Organization", name: "Flatsby", url: SITE_URL },
    },
    ...(page.faq ? [faqPage(page.faq)] : []),
  ];
}

export function JsonLd({ graph }: { graph: object[] }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD with "<" escaped
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }).replace(/</g, "\\u003c"),
      }}
    />
  );
}
