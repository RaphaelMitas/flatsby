import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function HomeLayout() {
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
          title: "Home",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-group"
        options={{
          title: "Create Group",
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="group-settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="shopping-lists"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
