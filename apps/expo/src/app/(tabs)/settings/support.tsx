import { Linking, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { SUPPORT_EMAIL } from "@flatsby/validators/billing";

import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";

export default function SupportScreen() {
  const t = useTranslations("billing.support");

  return (
    <AppScrollView>
      <View className="gap-3 px-4 py-4">
        <Text className="text-foreground text-base">{t("free")}</Text>
        <Text className="text-muted-foreground text-sm">{t("shutdown")}</Text>
        <Text className="text-muted-foreground text-sm">{t("cost")}</Text>
        <Text className="text-muted-foreground text-sm">{t("chipIn")}</Text>
      </View>
      <SettingsSection>
        <SettingsItem
          testID="support-email"
          title={SUPPORT_EMAIL}
          iconName="mail"
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
      </SettingsSection>
    </AppScrollView>
  );
}
