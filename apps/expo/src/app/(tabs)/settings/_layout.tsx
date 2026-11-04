import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { TabSafeArea } from "~/lib/ui/safe-area";
import { useThemeColors, useThemedScreenOptions } from "~/lib/utils";

export default function SettingsLayout() {
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const { getColor } = useThemeColors();
  const t = useTranslations();

  return (
    <TabSafeArea>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen
          name="index"
          options={{
            title: t("navigation.settings"),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            title: t("navigation.account"),
          }}
        />
        <Stack.Screen
          name="legal"
          options={{
            title: t("settings.sections.legal"),
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: t("navigation.profile"),
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="passkeys"
          options={{
            title: t("settings.passkeys.title"),
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="analytics"
          options={{
            title: t("settings.analytics.title"),
          }}
        />
        <Stack.Screen
          name="danger"
          options={{
            title: t("navigation.dangerZone"),
            headerTintColor: getColor("destructive"),
          }}
        />
        <Stack.Screen
          name="credits"
          options={{
            title: t("settings.items.buyCredits"),
            presentation: "modal",
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="manage-groups"
          options={{
            title: t("navigation.manageGroups"),
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="group-settings/index"
          options={{
            title: t("navigation.groupSettings"),
          }}
        />
        <Stack.Screen
          name="group-settings/members"
          options={{
            title: t("navigation.members"),
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="group-settings/group-details"
          options={{
            title: t("navigation.groupDetails"),
          }}
        />
        <Stack.Screen
          name="group-settings/expenses"
          options={{
            title: t("group.expenseSettings.title"),
          }}
        />
        <Stack.Screen
          name="group-settings/member-actions"
          options={{
            title: t("navigation.memberActions"),
            presentation: "modal",
            headerShown: true,
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="group-settings/invite"
          options={{
            title: t("invite.open"),
            presentation: "modal",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="group-settings/import-expenses"
          options={{
            title: t("splitwiseImport.importExpenses"),
            ...solidHeader,
          }}
        />
      </Stack>
    </TabSafeArea>
  );
}
