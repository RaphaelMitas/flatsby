import type { ShoppingListSummary } from "@flatsby/api";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { useShoppingStore } from "~/utils/shopping-store";
import { Switcher } from "./Switcher";

export function ListSwitcher({
  lists,
  current,
}: {
  lists: ShoppingListSummary[];
  current: ShoppingListSummary;
}) {
  const t = useTranslations("shoppingList");
  const router = useRouter();
  const { selectedGroupName, setSelectedShoppingList } = useShoppingStore();
  const itemsLeft = (count: number) => t("itemsLeft", { count });

  return (
    <Switcher
      barTestID="shopping-list-title"
      sheetTestID="list-switcher"
      icon="shopping-basket"
      title={current.name}
      subtitle={`${itemsLeft(current.uncheckedItemLength)} · ${t("switcher.listCount", { count: lists.length })}`}
      sheetTitle={t("switcher.title")}
      caption={selectedGroupName ?? undefined}
      items={lists.map((list) => ({
        id: list.id,
        title: list.name,
        subtitle: itemsLeft(list.uncheckedItemLength),
        more: {
          label: t("switcher.moreFor", { name: list.name }),
          onPress: () =>
            router.push({
              pathname: "/(tabs)/shoppingList/edit-list",
              params: { listId: list.id },
            }),
        },
      }))}
      selectedId={current.id}
      onSelect={(list) => setSelectedShoppingList(list.id, list.title)}
      actions={[
        {
          testID: "list-switcher-new",
          icon: "plus",
          title: t("switcher.newList"),
          onPress: () => router.push("/(tabs)/shoppingList/create"),
        },
      ]}
    />
  );
}
