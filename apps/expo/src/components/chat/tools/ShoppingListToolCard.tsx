import type { AddToShoppingListResult } from "@flatsby/validators/chat/tools";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { ShoppingItemDisplay } from "~/components/shoppingList/ShoppingItemDisplay";
import { Card, CardContent, CardDescription, CardHeader } from "~/lib/ui/card";
import { ToolErrorDisplay } from "./ToolErrorDisplay";

interface ShoppingListToolCardProps {
  result: AddToShoppingListResult;
}

export function ShoppingListToolCard({ result }: ShoppingListToolCardProps) {
  const hasFailures = result.failedItems && result.failedItems.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Added to {result.shoppingListName}</CardDescription>
      </CardHeader>
      <CardContent>
        <FlashList
          data={result.addedItems}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <ShoppingItemDisplay
              key={item.id}
              name={item.name}
              completed={false}
              categoryId={item.categoryId}
              disabled
            />
          )}
        />
        {hasFailures &&
          result.failedItems?.map((item, index) => (
            <ToolErrorDisplay
              key={`failed-${index}`}
              error={`${item.name} - ${item.reason}`}
            />
          ))}
      </CardContent>
    </Card>
  );
}
