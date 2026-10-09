import type { Platform } from "./HeroSection";
import { HOME_FAQ } from "./content";
import { CTASection } from "./CTASection";
import { FactsSection } from "./FactsSection";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { SCREENSHOTS } from "./pages";
import { ScreenshotImage } from "./ScreenshotImage";
import { SiteShell } from "./SiteShell";
import { homeJsonLd, JsonLd } from "./structured-data";

export function LandingPage({ platform }: { platform: Platform }) {
  return (
    <SiteShell>
      <JsonLd graph={homeJsonLd(HOME_FAQ)} />
      <HeroSection platform={platform} />
      <div className="mx-auto max-w-5xl px-4">
        <ScreenshotImage shot={SCREENSHOTS.webHome} />
      </div>
      <FeaturesSection />
      <HowItWorksSection />
      <FactsSection />
      <FaqSection items={HOME_FAQ} showAllLink />
      <CTASection />
    </SiteShell>
  );
}
