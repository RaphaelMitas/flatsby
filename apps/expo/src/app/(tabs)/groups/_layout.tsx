import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function GroupsLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        ...themedScreenOptions,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Your Groups",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Group",
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
