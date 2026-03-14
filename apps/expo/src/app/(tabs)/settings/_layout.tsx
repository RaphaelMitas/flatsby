import { Stack } from "expo-router";

import { useThemeColors, useThemedScreenOptions } from "~/lib/utils";

export default function SettingsLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const { getColor } = useThemeColors();

  return (
    <Stack screenOptions={themedScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          title: "Account",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="danger"
        options={{
          title: "Danger Zone",
          headerBackTitle: "",
          headerTintColor: getColor("destructive"),
        }}
      />
      <Stack.Screen
        name="credits"
        options={{
          title: "Buy Credits",
          headerBackTitle: "",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="group-settings/index"
        options={{
          title: "Group Settings",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/members"
        options={{
          title: "Members",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/group-details"
        options={{
          title: "Group Details",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-settings/member-actions"
        options={{
          title: "Member Actions",
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="group-settings/import-expenses"
        options={{
          title: "Import Expenses",
          headerBackTitle: "",
        }}
      />
    </Stack>
  );
}
