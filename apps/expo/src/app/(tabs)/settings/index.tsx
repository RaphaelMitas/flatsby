import { Linking } from "react-native";
import { Link, Stack } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { localeNames, locales } from "@flatsby/i18n/locale";

import type { Theme } from "~/lib/ui/theme";
import type { UpdateNudgeFrequency } from "~/utils/update-nudge-frequency";
import { EveningReminderItem } from "~/components/settings/EveningReminderItem";
import { SettingsChoiceItem } from "~/components/settings/SettingsChoiceItem";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useTheme } from "~/lib/ui/theme";
import { useAnalyticsConsent } from "~/utils/analytics/consent";
import { trpc } from "~/utils/api";
import { signOut } from "~/utils/auth/auth-client";
import { useHomeVersion } from "~/utils/home-version";
import { useLocalePreference } from "~/utils/intl-provider";
import { useShoppingStore } from "~/utils/shopping-store";
import { updateNudgeFrequency } from "~/utils/update-nudge-frequency";
import { writeReviewUrl } from "~/utils/useReviewNudge";
import { useSelectedGroup } from "~/utils/useSelectedGroup";

export default function SettingsIndex() {
  const t = useTranslations();
  const locale = useLocale();
  const { storedTheme, setTheme } = useTheme();
  const { preference, setPreference } = useLocalePreference();
  const analyticsConsent = useAnalyticsConsent();
  const { clearSelectedGroup } = useShoppingStore();
  const { group: currentGroup, name: groupName } = useSelectedGroup();
  const { version: homeVersion, switchTo: switchHome } = useHomeVersion();
  const home = homeVersion === "new" ? "new" : "classic";
  const updateNudge = updateNudgeFrequency.useValue();

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const handleLogout = async () => {
    clearSelectedGroup();
    await signOut();
  };

  const themeLabels = {
    system: t("settings.theme.system"),
    light: t("settings.theme.light"),
    dark: t("settings.theme.dark"),
  } satisfies Record<Theme, string>;
  const homeLabels = {
    classic: t("settings.items.homeClassic"),
    new: t("settings.items.homeNew"),
  };
  const updateNudgeLabels = {
    off: t("settings.items.updateNudgeOff"),
    monthly: t("settings.items.updateNudgeMonthly"),
    version: t("settings.items.updateNudgeVersion"),
  } satisfies Record<UpdateNudgeFrequency, string>;

  return (
    <SafeAreaView>
      <Stack.Screen options={{ title: t("navigation.settings") }} />
      <AppScrollView>
        <SettingsSection>
          <Link href="/settings/account" asChild>
            <SettingsItem
              testID="settings-account"
              title={user.name}
              subtitle={user.email}
              iconName="user"
            />
          </Link>
        </SettingsSection>
        <SettingsSection title={t("settings.sections.group")}>
          <Link href="/settings/group-settings" asChild>
            <SettingsItem
              title={groupName ?? t("navigation.groupSettings")}
              value={
                currentGroup &&
                t("group.memberCount", { count: currentGroup.memberCount })
              }
              iconName="users"
            />
          </Link>
          <Link href="/settings/manage-groups" asChild>
            <SettingsItem
              title={t("settings.items.changeGroup")}
              iconName="arrow-left-right"
            />
          </Link>
        </SettingsSection>
        <SettingsSection title={t("settings.sections.app")}>
          <SettingsChoiceItem
            title={t("settings.items.theme")}
            value={themeLabels[storedTheme ?? "system"]}
            iconName="palette"
            selected={storedTheme}
            onSelect={setTheme}
            choices={[
              { value: "system", label: themeLabels.system, icon: "sun-moon" },
              { value: "light", label: themeLabels.light, icon: "sun" },
              { value: "dark", label: themeLabels.dark, icon: "moon" },
            ]}
          />
          <SettingsChoiceItem
            title={t("settings.language.title")}
            value={localeNames[locale]}
            iconName="languages"
            selected={preference ?? "system"}
            onSelect={(value) =>
              setPreference(value === "system" ? null : value)
            }
            choices={[
              { value: "system", label: t("settings.language.system") },
              ...locales.map((value) => ({ value, label: localeNames[value] })),
            ]}
          />
          <SettingsChoiceItem
            title={t("settings.items.home")}
            value={homeLabels[home]}
            iconName="house"
            selected={home}
            onSelect={(value) => switchHome(value, "settings")}
            choices={[
              { value: "classic", label: homeLabels.classic },
              { value: "new", label: homeLabels.new },
            ]}
          />
          <EveningReminderItem />
          <SettingsChoiceItem
            title={t("settings.items.updateNudge")}
            value={updateNudgeLabels[updateNudge ?? "version"]}
            iconName="download"
            selected={updateNudge}
            onSelect={updateNudgeFrequency.save}
            choices={[
              { value: "off", label: updateNudgeLabels.off },
              { value: "monthly", label: updateNudgeLabels.monthly },
              { value: "version", label: updateNudgeLabels.version },
            ]}
          />
          <Link href="/settings/analytics" asChild>
            <SettingsItem
              testID="settings-analytics"
              title={t("settings.items.analytics")}
              value={
                user.analyticsOptOut && !analyticsConsent
                  ? t("settings.items.disabled")
                  : t("settings.items.enabled")
              }
              iconName="activity"
            />
          </Link>
        </SettingsSection>
        <SettingsSection>
          <Link href="/settings/support" asChild>
            <SettingsItem
              testID="settings-support"
              title={t("billing.support.title")}
              iconName="heart"
            />
          </Link>
          <SettingsItem
            title={t("settings.items.rateApp")}
            iconName="star"
            onPress={() => Linking.openURL(writeReviewUrl)}
          />
          <Link href="/settings/legal" asChild>
            <SettingsItem
              title={t("settings.sections.legal")}
              iconName="file-text"
            />
          </Link>
        </SettingsSection>
        <SettingsSection className="pb-4">
          <SettingsItem
            title={t("settings.items.logout")}
            iconName="log-out"
            onPress={handleLogout}
            variant="destructive"
          />
        </SettingsSection>
      </AppScrollView>
    </SafeAreaView>
  );
}
