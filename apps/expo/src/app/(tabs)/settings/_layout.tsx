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
    </Stack>
  );
}
