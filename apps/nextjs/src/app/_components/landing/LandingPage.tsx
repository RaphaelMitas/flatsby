import type { Locale } from "@flatsby/i18n/locale";

import type { Platform } from "./platform";
import { faqItems, HOME_FAQ } from "./content";
import { CTASection } from "./CTASection";
import { FactsSection } from "./FactsSection";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { marketingTranslator } from "./i18n";
import { screenshot } from "./pages";
import { ScreenshotImage } from "./ScreenshotImage";
import { SiteShell } from "./SiteShell";
import { homeJsonLd, JsonLd } from "./structured-data";

export function LandingPage({
  locale,
  platform,
}: {
  locale: Locale;
  platform: Platform;
}) {
  const t = marketingTranslator(locale);
  const faq = faqItems(t, HOME_FAQ);
  return (
    <SiteShell path="/">
      <JsonLd graph={homeJsonLd(locale, faq)} />
      <HeroSection platform={platform} />
      <div className="mx-auto max-w-5xl px-4">
        <ScreenshotImage shot={screenshot(t, "webHome")} />
      </div>
      <FeaturesSection />
      <HowItWorksSection />
      <FactsSection />
      <FaqSection items={faq} showAllLink />
      <CTASection />
    </SiteShell>
  );
}
