import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useThemedScreenOptions } from "~/lib/utils";

export default function HomeLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const t = useTranslations("navigation");

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
          title: t("home"),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-group"
        options={{
          title: t("createGroup"),
          presentation: "modal",
          headerShown: true,
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
