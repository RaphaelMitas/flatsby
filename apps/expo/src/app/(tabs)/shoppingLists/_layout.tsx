import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { useThemeColors, useThemedScreenOptions } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";

export default function ShoppingListsLayout() {
  const session = useSession();
  const themedScreenOptions = useThemedScreenOptions();
  const { getColor } = useThemeColors();

  const isSessionLoading =
    session.status === "pending" ||
    session.isLoading ||
    session.isFetching ||
    session.fetchStatus === "fetching";

  if (isSessionLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: getColor("background"),
        }}
      >
        <ActivityIndicator color={getColor("primary")} />
      </View>
    );
  }

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
