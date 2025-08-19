import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ShoppingListsLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        ...themedScreenOptions,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Your Shopping List",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-item"
        options={{
          title: "Edit Item",
          headerBackTitle: "",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
