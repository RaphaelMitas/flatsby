import { useState } from "react";
import { Linking, Platform } from "react-native";
import { Link, Stack } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";
import { useLocale, useTranslations } from "use-intl";

import { localeNames, localePath, locales } from "@flatsby/i18n/locale";

import type { Theme } from "~/lib/ui/theme";
import { SettingsChoiceItem } from "~/components/settings/SettingsChoiceItem";
import { SettingsHeader } from "~/components/settings/SettingsHeader";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { UsageDisplay } from "~/components/settings/UsageDisplay";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Checkbox } from "~/lib/ui/checkbox";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useTheme } from "~/lib/ui/theme";
import { trpc } from "~/utils/api";
import { signOut } from "~/utils/auth/auth-client";
import { getBaseUrl } from "~/utils/base-url";
import { useLocalePreference } from "~/utils/intl-provider";
import { useShoppingStore } from "~/utils/shopping-store";

export default function SettingsIndex() {
  const t = useTranslations();
  const locale = useLocale();
  const { storedTheme, setTheme } = useTheme();
  const { preference, setPreference } = useLocalePreference();
  const posthog = usePostHog();
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(
    () => !posthog.optedOut,
  );
  const { clearSelectedGroup } = useShoppingStore();

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const handleLogout = async () => {
    clearSelectedGroup();
    await signOut();
  };

  const handleAnalyticsToggle = (enabled: boolean) => {
    setIsAnalyticsEnabled(enabled);
    if (enabled) {
      void posthog.optIn();
    } else {
      void posthog.optOut();
    }
  };

  const getThemeDisplayName = (theme: Theme | null) => {
    switch (theme) {
      case "dark":
        return t("settings.theme.dark");
      case "light":
        return t("settings.theme.light");
      default:
        return t("settings.theme.system");
    }
  };

  return (
    <SafeAreaView>
      <Stack.Screen options={{ title: t("navigation.settings") }} />
      <AppScrollView>
        <SettingsHeader title={user.name} />

        <SettingsSection title={t("settings.sections.usage")}>
          <UsageDisplay />
          {Platform.OS === "ios" && (
            <Link href="/settings/credits" asChild>
              <SettingsItem
                title={t("settings.items.buyCredits")}
                subtitle={t("settings.items.buyCreditsSubtitle")}
                iconName="credit-card"
              />
            </Link>
          )}
        </SettingsSection>
        <SettingsSection title={t("settings.sections.appearance")}>
          <SettingsChoiceItem
            title={t("settings.items.theme")}
            subtitle={t("settings.items.themeSubtitle", {
              theme: getThemeDisplayName(storedTheme),
            })}
            iconName="palette"
            selected={storedTheme}
            onSelect={setTheme}
            choices={[
              {
                value: "system",
                label: t("settings.theme.system"),
                icon: "sun-moon",
              },
              { value: "light", label: t("settings.theme.light"), icon: "sun" },
              { value: "dark", label: t("settings.theme.dark"), icon: "moon" },
            ]}
          />
          <SettingsChoiceItem
            title={t("settings.language.title")}
            subtitle={localeNames[locale]}
            iconName="languages"
            selected={preference ?? "system"}
            onSelect={(value) =>
              setPreference(value === "system" ? null : value)
            }
            choices={[
              { value: "system", label: t("settings.theme.system") },
              ...locales.map((value) => ({ value, label: localeNames[value] })),
            ]}
          />
        </SettingsSection>
        <SettingsSection title={t("settings.sections.groups")}>
          <Link href="/settings/manage-groups" asChild>
            <SettingsItem
              title={t("settings.items.changeGroup")}
              subtitle={t("settings.items.changeGroupSubtitle")}
              iconName="arrow-left-right"
            />
          </Link>
          <Link href="/settings/group-settings" asChild>
            <SettingsItem
              title={t("navigation.groupSettings")}
              subtitle={t("settings.items.groupSettingsSubtitle")}
              iconName="users"
            />
          </Link>
        </SettingsSection>
        <SettingsSection title={t("settings.sections.account")}>
          <Link href="/settings/profile" asChild>
            <SettingsItem
              title={t("navigation.profile")}
              subtitle={t("settings.items.profileSubtitle")}
              iconName="user"
            />
          </Link>
          <SettingsItem
            title={t("settings.items.manageAccount")}
            subtitle={t("settings.items.manageAccountSubtitle")}
            iconName="settings"
            onPress={() => Linking.openURL(`${getBaseUrl()}/user-settings`)}
          />
          <SettingsItem
            title={t("settings.items.shareAnalytics")}
            subtitle={
              isAnalyticsEnabled
                ? t("settings.items.enabled")
                : t("settings.items.disabled")
            }
            iconName="activity"
            onPress={() => handleAnalyticsToggle(!isAnalyticsEnabled)}
            rightContent={
              <Checkbox
                checked={!posthog.optedOut}
                onCheckedChange={handleAnalyticsToggle}
              />
            }
          />
          <SettingsItem
            title={t("settings.items.logout")}
            subtitle={t("settings.items.logoutSubtitle")}
            iconName="log-out"
            onPress={handleLogout}
          />
        </SettingsSection>
        <SettingsSection title={t("navigation.dangerZone")}>
          <Link href="/settings/danger" asChild>
            <SettingsItem
              testID="settings-delete-account"
              title={t("settings.items.deleteAccount")}
              subtitle={t("settings.items.deleteAccountSubtitle")}
              iconName="trash-2"
              variant="destructive"
            />
          </Link>
        </SettingsSection>
        <SettingsSection title={t("settings.sections.legal")} className="pb-4">
          <SettingsItem
            title={t("navigation.termsOfService")}
            subtitle={t("settings.items.termsSubtitle")}
            iconName="file-text"
            onPress={() =>
              Linking.openURL(
                `${getBaseUrl()}${localePath(locale, "/legal/terms")}`,
              )
            }
          />
          <SettingsItem
            title={t("navigation.privacyPolicy")}
            subtitle={t("settings.items.privacySubtitle")}
            iconName="shield"
            onPress={() =>
              Linking.openURL(
                `${getBaseUrl()}${localePath(locale, "/legal/privacy")}`,
              )
            }
          />
          <SettingsItem
            title={t("navigation.legalNotice")}
            subtitle={t("settings.items.legalNoticeSubtitle")}
            iconName="info"
            onPress={() =>
              Linking.openURL(
                `${getBaseUrl()}${localePath(locale, "/legal/legal-notice")}`,
              )
            }
          />
          <SettingsItem
            title={t("settings.items.exportData")}
            subtitle={t("settings.items.exportDataSubtitle")}
            iconName="download"
            onPress={() => Linking.openURL(`${getBaseUrl()}/user-settings`)}
          />
        </SettingsSection>
      </AppScrollView>
    </SafeAreaView>
  );
}
