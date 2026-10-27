import { Suspense, useEffect } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { FirstList } from "~/components/shoppingList/FirstList";
import ShoppingList from "~/components/shoppingList/ShoppingList";
import { ListSwitcher } from "~/components/switcher/ListSwitcher";
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
  const { selectedShoppingListId, setSelectedShoppingList } =
    useShoppingStore();
  const { data } = useSuspenseQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
  );
  // A list still being created has a placeholder id and can't be opened yet
  const lists = (data.success ? data.data : []).filter(({ id }) => id > 0);
  const current =
    lists.find(({ id }) => id === selectedShoppingListId) ?? lists[0];

  useEffect(() => {
    if (current && current.id !== selectedShoppingListId)
      setSelectedShoppingList(current.id, current.name);
  }, [current, selectedShoppingListId, setSelectedShoppingList]);

  if (!data.success) return null;
  if (!current) return <FirstList groupId={groupId} />;

  return (
    <>
      <View className="px-4 pt-2 pb-1">
        <ListSwitcher lists={lists} current={current} />
      </View>
      <Suspense fallback={<ListSkeleton />}>
        <ShoppingList groupId={groupId} shoppingListId={current.id} />
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
