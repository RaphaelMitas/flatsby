import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ShoppingListsLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const t = useTranslations("shoppingList");

  return (
    <Stack screenOptions={themedScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t("yourShoppingLists"),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t("createShoppingList"),
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
