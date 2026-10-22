import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useSolidHeader, useThemedScreenOptions } from "~/lib/utils";

export default function ShoppingListsLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const solidHeader = useSolidHeader();
  const t = useTranslations("shoppingList");

  return (
    <Stack screenOptions={themedScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t("yourShoppingList"),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-item"
        options={{
          title: t("editItem"),
          headerBackTitle: "",
          presentation: "modal",
          ...solidHeader,
        }}
      />
    </Stack>
  );
}
