import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useThemeColors, useThemedScreenOptions } from "~/lib/utils";

export default function SettingsLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const { getColor } = useThemeColors();
  const t = useTranslations();

  return (
    <Stack screenOptions={themedScreenOptions}>
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
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: t("navigation.profile"),
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="danger"
        options={{
          title: t("navigation.dangerZone"),
          headerBackTitle: "",
          headerTintColor: getColor("destructive"),
        }}
      />
      <Stack.Screen
        name="credits"
        options={{
          title: t("settings.items.buyCredits"),
          headerBackTitle: "",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="group-settings/index"
        options={{
          title: t("navigation.groupSettings"),
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/members"
        options={{
          title: t("navigation.members"),
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/group-details"
        options={{
          title: t("navigation.groupDetails"),
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/expenses"
        options={{
          title: t("group.expenseSettings.title"),
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/member-actions"
        options={{
          title: t("navigation.memberActions"),
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="group-settings/import-expenses"
        options={{
          title: t("splitwiseImport.importExpenses"),
          headerBackTitle: "",
        }}
      />
    </Stack>
  );
}
