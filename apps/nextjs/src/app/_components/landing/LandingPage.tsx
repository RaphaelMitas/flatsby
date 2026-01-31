import { CTASection } from "./CTASection";
import { FeaturesSection } from "./FeaturesSection";
import { Footer } from "./Footer";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { LandingHeader } from "./LandingHeader";

export function LandingPage() {
  return (
    <div className="bg-background h-screen overflow-auto">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
