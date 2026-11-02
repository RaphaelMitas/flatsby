import { useLocale, useTranslations } from "use-intl";

import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { openLegalPage } from "~/utils/legal";

export default function LegalScreen() {
  const t = useTranslations("navigation");
  const locale = useLocale();

  return (
    <SafeAreaView>
      <AppScrollView>
        <SettingsSection>
          <SettingsItem
            title={t("termsOfService")}
            iconName="file-text"
            onPress={() => openLegalPage(locale, "terms")}
          />
          <SettingsItem
            title={t("privacyPolicy")}
            iconName="shield"
            onPress={() => openLegalPage(locale, "privacy")}
          />
          <SettingsItem
            title={t("legalNotice")}
            iconName="info"
            onPress={() => openLegalPage(locale, "legal-notice")}
          />
        </SettingsSection>
      </AppScrollView>
    </SafeAreaView>
  );
}
