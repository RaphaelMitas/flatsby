import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import { ShoppingItemDisplay } from "~/components/shoppingList/ShoppingItemDisplay";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import { useShoppingStore } from "~/utils/shopping-store";

interface ShoppingListItem {
  id: number;
  name: string;
  categoryId: CategoryIdWithAiAutoSelect | null;
  completed: boolean;
}

interface ShoppingListItemsCardProps {
  listName: string;
  items: ShoppingListItem[];
  totalCount: number;
  shoppingListId: number;
}

export function ShoppingListItemsCard({
  listName,
  items,
  totalCount,
  shoppingListId,
}: ShoppingListItemsCardProps) {
  const [visibleItems, setVisibleItems] = useState(5);
  const { setSelectedShoppingList } = useShoppingStore();

  const router = useRouter();
  return (
    <Card className="w-full">
      <CardHeader>
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <CardTitle>{listName}</CardTitle>
            <CardDescription>({totalCount} items)</CardDescription>
          </View>
          <Button
            onPress={() => {
              setSelectedShoppingList(shoppingListId, listName);
              router.push("/(tabs)/shoppingList");
            }}
            variant="outline"
            size="sm"
            title="View List"
            icon="arrow-right"
          />
        </View>
      </CardHeader>
      <CardContent className="h-full w-full flex-1 gap-2">
        <View className="h-full w-full">
          <FlashList
            data={items.slice(0, visibleItems)}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <ShoppingItemDisplay
                name={item.name}
                completed={item.completed}
                categoryId={item.categoryId}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
          />
          {visibleItems < items.length && (
            <Button
              onPress={() =>
                setVisibleItems((prev) => {
                  if (prev + 5 >= items.length) {
                    return items.length;
                  }
                  return prev + 5;
                })
              }
              variant="ghost"
              size="sm"
              title="Load more"
            />
          )}
        </View>
      </CardContent>
    </Card>
  );
}
