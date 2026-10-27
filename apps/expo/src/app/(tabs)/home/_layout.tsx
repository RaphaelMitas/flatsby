import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { TabSafeArea } from "~/lib/ui/safe-area";
import { useThemedScreenOptions } from "~/lib/utils";

export default function HomeLayout() {
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const t = useTranslations();

  return (
    <TabSafeArea>
      <Stack
        screenOptions={{
          headerShown: false,
          ...screenOptions,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t("navigation.home"),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="create-group"
          options={{
            title: t("navigation.createGroup"),
            presentation: "modal",
            headerShown: true,
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="invite"
          options={{
            title: t("invite.open"),
            presentation: "modal",
            headerShown: true,
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="shopping-lists"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </TabSafeArea>
  );
}
