import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Button } from "~/lib/ui/button";
import { useShoppingStore } from "~/utils/shopping-store";

export function QuickActions() {
  const router = useRouter();
  const { selectedShoppingListName } = useShoppingStore();

  return (
    <View className="gap-2">
      <Text className="text-muted-foreground text-sm">Quick actions</Text>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          icon="message-square"
          title="Chat"
          className="flex-1"
          onPress={() => router.push("/(tabs)/chat")}
        />
        <Button
          variant="outline"
          icon="shopping-cart"
          title={selectedShoppingListName ?? "Shop"}
          className="min-w-0 flex-1"
          numberOfLines={1}
          textClassName="shrink"
          onPress={() =>
            router.push(
              !selectedShoppingListName
                ? "/(tabs)/shoppingList"
                : "/(tabs)/home/shopping-lists",
              { withAnchor: true },
            )
          }
        />
        <Button
          variant="outline"
          icon="plus"
          title="Expense"
          className="flex-1"
          onPress={() =>
            router.push("/(tabs)/expenses/create", { withAnchor: true })
          }
        />
      </View>
    </View>
  );
}
