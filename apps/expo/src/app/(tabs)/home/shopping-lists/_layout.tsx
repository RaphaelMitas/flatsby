import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ShoppingListsLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Stack initialRouteName="index" screenOptions={themedScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Your Shopping Lists",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Shopping List",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
