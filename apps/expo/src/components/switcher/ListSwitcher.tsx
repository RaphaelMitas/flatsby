import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { ShoppingListSummary } from "@flatsby/api";
import { useRef } from "react";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { useShoppingStore } from "~/utils/shopping-store";
import { SwitcherBar } from "./SwitcherBar";
import { SwitcherSheet } from "./SwitcherSheet";

export function ListSwitcher({
  lists,
  current,
}: {
  lists: ShoppingListSummary[];
  current: ShoppingListSummary;
}) {
  const t = useTranslations("shoppingList");
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { selectedGroupName, setSelectedShoppingList } = useShoppingStore();
  const itemsLeft = (count: number) => t("itemsLeft", { count });

  return (
    <>
      <SwitcherBar
        testID="shopping-list-title"
        icon="shopping-basket"
        title={current.name}
        subtitle={`${itemsLeft(current.uncheckedItemLength)} · ${t("switcher.listCount", { count: lists.length })}`}
        onPress={() => sheetRef.current?.present()}
      />
      <SwitcherSheet
        sheetRef={sheetRef}
        testID="list-switcher"
        title={t("switcher.title")}
        caption={selectedGroupName ?? undefined}
        icon="shopping-basket"
        items={lists.map((list) => ({
          id: list.id,
          title: list.name,
          subtitle: itemsLeft(list.uncheckedItemLength),
        }))}
        selectedId={current.id}
        onSelect={(list) => setSelectedShoppingList(list.id, list.title)}
        onMore={(list) =>
          router.push({
            pathname: "/(tabs)/shoppingList/edit-list",
            params: { listId: list.id },
          })
        }
        moreLabel={(list) => t("switcher.moreFor", { name: list.title })}
        actions={[
          {
            testID: "list-switcher-new",
            icon: "plus",
            title: t("switcher.newList"),
            onPress: () => router.push("/(tabs)/shoppingList/create"),
          },
        ]}
      />
    </>
  );
}
