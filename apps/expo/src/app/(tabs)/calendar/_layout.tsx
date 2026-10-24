import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { TabSafeArea } from "~/lib/ui/safe-area";
import { useThemedScreenOptions } from "~/lib/utils";

export default function CalendarLayout() {
  const { screenOptions } = useThemedScreenOptions();
  const t = useTranslations();

  return (
    <TabSafeArea>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen
          name="index"
          options={{ title: t("navigation.calendar"), headerShown: false }}
        />
        <Stack.Screen
          name="[itemId]"
          options={{ title: "", headerBackTitle: "", presentation: "modal" }}
        />
        <Stack.Screen
          name="form"
          options={{
            title: t("calendar.form.newTitle"),
            headerBackTitle: "",
            presentation: "modal",
          }}
        />
      </Stack>
    </TabSafeArea>
  );
}
