import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useThemedScreenOptions } from "~/lib/utils";

export default function CalendarLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const t = useTranslations();

  return (
    <Stack screenOptions={themedScreenOptions}>
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
  );
}
