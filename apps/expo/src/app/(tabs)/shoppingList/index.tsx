import { Suspense } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslations } from "use-intl";

import ShoppingList from "~/components/shoppingList/ShoppingList";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { SkeletonList, SkeletonText } from "~/lib/ui/skeleton";
import { useShoppingStore } from "~/utils/shopping-store";

const ShoppingListPage = () => {
  const t = useTranslations();
  const { selectedShoppingListId, selectedGroupId } = useShoppingStore();
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

  if (!selectedShoppingListId) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center gap-4 p-4">
          <Icon name="shopping-basket" size={48} color="muted-foreground" />
          <Text className="text-muted-foreground text-center text-lg font-semibold">
            {t("shoppingList.selectListToContinue")}
          </Text>
          <Link href="/(tabs)/home/shopping-lists" asChild>
            <Button
              title={t("shoppingList.chooseShoppingList")}
              variant="primary"
              size="lg"
              icon="list"
            />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <Suspense
        fallback={
          <View className="flex-1 p-8">
            <SkeletonText className="text-foreground mx-auto mb-6 w-20 text-center text-xl font-semibold" />
            <Text className="text-muted-foreground mb-3 text-center text-sm">
              {t("shoppingList.sections.today")}
            </Text>
            <SkeletonList items={8} />
          </View>
        }
      >
        <ShoppingList
          groupId={selectedGroupId}
          shoppingListId={selectedShoppingListId}
        />
      </Suspense>
    </SafeAreaView>
  );
};

export default ShoppingListPage;
