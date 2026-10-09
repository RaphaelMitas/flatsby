import type { FaqItem } from "./content";
import type { ContentPageData } from "./pages";
import {
  APP_STORE_URL,
  DESCRIPTION,
  FEATURES,
  GITHUB_URL,
  PLAY_STORE_URL,
  SITE_URL,
  UPDATED,
} from "./content";

const ORG_ID = `${SITE_URL}/#org`;

function faqPage(items: readonly FaqItem[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function homeJsonLd(faq: readonly FaqItem[]) {
  return [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Flatsby",
      url: SITE_URL,
      logo: `${SITE_URL}/web-app-manifest-512x512.png`,
      sameAs: [APP_STORE_URL, PLAY_STORE_URL, GITHUB_URL],
      founder: { "@type": "Person", name: "Raphael Mitas" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Flatsby",
      url: SITE_URL,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, iOS, Android",
      description: DESCRIPTION,
      publisher: { "@id": ORG_ID },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      installUrl: [APP_STORE_URL, PLAY_STORE_URL],
      license: "https://opensource.org/licenses/MIT",
      featureList: FEATURES.map((f) => f.title),
    },
    faqPage(faq),
  ];
}

export function contentPageJsonLd(page: ContentPageData) {
  const url = `${SITE_URL}/${page.slug}`;
  return [
    {
      "@type": "WebPage",
      url,
      name: page.title,
      description: page.description,
      dateModified: UPDATED,
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
