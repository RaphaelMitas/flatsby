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
        <Text className="text-muted-foreground text-center text-lg font-semibold">
          No shopping list selected
        </Text>
        <Text className="text-muted-foreground mt-2 text-center text-sm">
          Please select a group and shopping list first
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      <Suspense
        fallback={
          <View className="flex-1 p-8">
            <SkeletonText className="text-foreground mx-auto mb-6 w-20 text-center text-xl font-semibold" />
            <Text className="text-muted-foreground mb-3 text-center text-sm">
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
