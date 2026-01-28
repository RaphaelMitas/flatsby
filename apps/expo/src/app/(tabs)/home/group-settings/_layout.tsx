import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function GroupSettingsLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Stack initialRouteName="index" screenOptions={themedScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Group Settings",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="members"
        options={{
          title: "Members",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="group-details"
        options={{
          title: "Group Details",
          headerBackTitle: "",
        }}
      />
      <Stack.Screen
        name="member-actions"
        options={{
          title: "Member Actions",
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
