import { Redirect, Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";

export default function ShoppingListsLayout() {
  const session = useSession();
  const themedScreenOptions = useThemedScreenOptions();

  if (!session.data?.user) {
    return <Redirect href="/auth/login" />;
  }

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
      <Stack.Screen
        name="edit-group"
        options={{
          title: "Edit Group",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
