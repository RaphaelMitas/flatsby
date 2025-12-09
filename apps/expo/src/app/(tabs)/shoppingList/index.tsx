import { Suspense } from "react";
import { Text, View } from "react-native";

import ShoppingList from "~/components/shoppingList/ShoppingList";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { SkeletonList, SkeletonText } from "~/lib/ui/skeleton";
import { useShoppingStore } from "~/utils/shopping-store";

const ShoppingListPage = () => {
  const { selectedShoppingListId, selectedGroupId } = useShoppingStore();

  if (!selectedGroupId || !selectedShoppingListId) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center text-lg font-semibold text-muted-foreground">
          No shopping list selected
        </Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          Please select a group and shopping list first
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Suspense
        fallback={
          <View className="flex-1 p-8">
            <SkeletonText className="mx-auto mb-6 w-20 text-center text-xl font-semibold text-foreground" />
            <Text className="mb-3 text-center text-sm text-muted-foreground">
              Today
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
