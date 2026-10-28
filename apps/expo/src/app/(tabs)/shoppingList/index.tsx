import { Suspense, useEffect } from "react";
import { Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { FirstList } from "~/components/shoppingList/FirstList";
import ShoppingList from "~/components/shoppingList/ShoppingList";
import { ListSwitcher } from "~/components/switcher/ListSwitcher";
import { SwitcherSettingsButton } from "~/components/switcher/SwitcherSettingsButton";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { SkeletonList, SkeletonText } from "~/lib/ui/skeleton";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

function ListSkeleton() {
  const t = useTranslations();
  return (
    <View className="flex-1 p-8">
      <SkeletonText className="text-foreground mx-auto mb-6 w-20 text-center text-xl font-semibold" />
      <Text className="text-muted-foreground mb-3 text-center text-sm">
        {t("shoppingList.sections.today")}
      </Text>
      <SkeletonList items={8} />
    </View>
  );
}

function ListTab({ groupId }: { groupId: number }) {
  const t = useTranslations();
  const {
    selectedShoppingListId,
    selectedShoppingListName,
    setSelectedShoppingList,
    clearSelectedShoppingList,
  } = useShoppingStore();
  const { data } = useSuspenseQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
  );
  const lists = data.success ? data.data : [];
  const selected = lists.find(({ id }) => id === selectedShoppingListId);
  // Only a list the user picked becomes the last used one
  const current = selected ?? lists[0];

  // Keeps the tab label in step when the picked list is renamed or deleted elsewhere
  useEffect(() => {
    if (!data.success || selectedShoppingListId === null) return;
    if (!selected) clearSelectedShoppingList();
    else if (selected.name !== selectedShoppingListName)
      setSelectedShoppingList(selected.id, selected.name);
  }, [
    data.success,
    selected,
    selectedShoppingListId,
    selectedShoppingListName,
    setSelectedShoppingList,
    clearSelectedShoppingList,
  ]);

  if (!data.success) return null;
  if (!current) return <FirstList groupId={groupId} />;

  return (
    <>
      <View className="flex-row items-stretch gap-2 px-4 pt-2 pb-3">
        <ListSwitcher lists={lists} current={current} className="flex-1" />
        <SwitcherSettingsButton
          testID="shopping-list-settings"
          label={t("shoppingList.switcher.editTitle")}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/shoppingList/edit-list",
              params: { listId: current.id },
            })
          }
        />
      </View>
      <Suspense
        fallback={
          <View className="flex-1 p-8">
            <SkeletonList items={8} />
          </View>
        }
      >
        <ShoppingList
          key={current.id}
          groupId={groupId}
          shoppingListId={current.id}
        />
      </Suspense>
    </>
  );
}

const ShoppingListPage = () => {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center gap-4 p-4">
          <Icon name="shopping-basket" size={48} color="muted-foreground" />
          <Text className="text-muted-foreground text-center text-lg font-semibold">
            {t("shoppingList.selectGroupToView")}
          </Text>
          <Link href="/(tabs)/home" asChild>
            <Button
              title={t("navigation.manageGroups")}
              variant="primary"
              size="lg"
              icon="arrow-left-right"
            />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <Suspense fallback={<ListSkeleton />}>
        <ListTab groupId={selectedGroupId} />
      </Suspense>
    </SafeAreaView>
  );
};

export default ShoppingListPage;
