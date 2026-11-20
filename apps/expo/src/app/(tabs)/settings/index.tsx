import { useRef } from "react";
import { Linking } from "react-native";
import { Link, Stack } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { localeNames, locales } from "@flatsby/i18n/locale";

import type { SwitcherSheetHandle } from "~/components/switcher/Switcher";
import { EveningReminderItem } from "~/components/settings/EveningReminderItem";
import { SettingsChoiceItem } from "~/components/settings/SettingsChoiceItem";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { GroupSwitcherSheet } from "~/components/switcher/GroupSwitcher";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useTheme } from "~/lib/ui/theme";
import { useAnalyticsConsent } from "~/utils/analytics/consent";
import { trpc } from "~/utils/api";
import { signOut } from "~/utils/auth/auth-client";
import { useLocalePreference } from "~/utils/intl-provider";
import { useShoppingStore } from "~/utils/shopping-store";
import {
  updateNudgeFrequency,
  useUpdateNudgeChoices,
} from "~/utils/update-nudge-frequency";
import { writeReviewUrl } from "~/utils/useReviewNudge";
import { useSelectedGroup } from "~/utils/useSelectedGroup";

export default function SettingsIndex() {
  const t = useTranslations();
  const locale = useLocale();
  const { palette } = useTheme();
  const { preference, setPreference } = useLocalePreference();
  const analyticsConsent = useAnalyticsConsent();
  const { clearSelectedGroup } = useShoppingStore();
  const { group: currentGroup, name: groupName } = useSelectedGroup();
  const updateNudge = updateNudgeFrequency.useValue();
  const updateNudgeChoices = useUpdateNudgeChoices();
  const groupSwitcher = useRef<SwitcherSheetHandle>(null);

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const handleLogout = async () => {
    clearSelectedGroup();
    await signOut();
  };

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
          <SettingsItem
            testID="settings-change-group"
            title={t("settings.items.changeGroup")}
            iconName="arrow-left-right"
            onPress={() => groupSwitcher.current?.present()}
            rightContent={
              <Icon
                name="chevrons-up-down"
                size={16}
                color="muted-foreground"
              />
            }
          />
        </SettingsSection>
        <SettingsSection title={t("settings.sections.app")}>
          <Link href="/settings/appearance" asChild>
            <SettingsItem
              testID="settings-appearance"
              title={t("settings.items.appearance")}
              value={t(`settings.appearance.palettes.${palette.id}`)}
              iconName="palette"
            />
          </Link>
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
          <EveningReminderItem />
          <SettingsChoiceItem
            title={t("settings.items.updateNudge")}
            value={updateNudgeChoices.labels[updateNudge ?? "version"]}
            iconName="download"
            selected={updateNudge}
            onSelect={updateNudgeFrequency.save}
            choices={updateNudgeChoices.choices}
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
      <GroupSwitcherSheet ref={groupSwitcher} />
    </SafeAreaView>
  );
}
