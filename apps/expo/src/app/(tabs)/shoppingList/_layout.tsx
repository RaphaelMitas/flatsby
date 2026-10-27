import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { TabSafeArea } from "~/lib/ui/safe-area";
import { useThemedScreenOptions } from "~/lib/utils";

export default function ShoppingListsLayout() {
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const t = useTranslations("shoppingList");

  return (
    <TabSafeArea>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen
          name="index"
          options={{
            title: t("yourShoppingList"),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="create"
          options={{
            title: t("createShoppingList"),
            headerBackTitle: "",
            presentation: "modal",
            ...solidHeader,
          }}
        />
        <Stack.Screen
          name="edit-list"
          options={{
            title: t("switcher.editTitle"),
            headerBackTitle: "",
            presentation: "modal",
            ...solidHeader,
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
    </TabSafeArea>
  );
}
