import type { ModifyDataOutput } from "@flatsby/validators/chat/tools";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useShoppingStore } from "~/utils/shopping-store";

interface ModifyDataResultProps {
  output: ModifyDataOutput;
}

export function ModifyDataResult({ output }: ModifyDataResultProps) {
  const router = useRouter();
  const { setSelectedShoppingList } = useShoppingStore();

  const handleShoppingListPress = (listId: number, listName: string) => {
    setSelectedShoppingList(listId, listName);
    router.push("/(tabs)/shoppingList");
  };

  if (!output.success) {
    return (
      <View className="my-2 flex-row items-center gap-2">
        <Icon name="circle-alert" size={16} color="destructive" />
        <Text className="text-destructive text-sm">{output.error}</Text>
      </View>
    );
  }

  const iconName =
    output.action === "create"
      ? "plus"
      : output.action === "update"
        ? "pencil"
        : "trash-2";

  const iconColor = output.action === "delete" ? "destructive" : "success";

  const actionLabel =
    output.action === "create"
      ? "Created"
      : output.action === "update"
        ? "Updated"
        : "Deleted";

  switch (output.entity) {
    case "shoppingListItem":
      return (
        <View className="my-2 flex-row items-center gap-2">
          <Icon name={iconName} size={16} color={iconColor} />
          <Text className="text-foreground text-sm">
            {actionLabel} "{output.result.name}"
            {output.action === "update" &&
              (output.result.completed ? " (checked off)" : " (unchecked)")}
          </Text>
        </View>
      );

    case "expense":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name={iconName} size={16} color={iconColor} />
              <CardTitle className="text-sm font-medium">
                {actionLabel} expense
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground font-medium">
                  {output.result.description ?? "Expense"}
                </Text>
                <Text className="text-foreground font-medium">
                  {formatCurrencyFromCents({
                    cents: output.result.amountInCents,
                    currency: output.result.currency,
                  })}
                </Text>
              </View>
              <Text className="text-muted-foreground text-sm">
                Paid by {output.result.paidByMemberName}
              </Text>
              {output.result.splits.length > 0 && (
                <View className="mt-2 gap-1">
                  <Text className="text-muted-foreground text-xs">
                    Split among:
                  </Text>
                  {output.result.splits.map((split, i) => (
                    <View
                      key={i}
                      className="flex-row items-center justify-between"
                    >
                      <Text className="text-foreground text-sm">
                        {split.memberName}
                      </Text>
                      <Text className="text-foreground text-sm">
                        {formatCurrencyFromCents({
                          cents: split.amountInCents,
                          currency: output.result.currency,
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      );

    case "shoppingList":
      return (
        <View className="my-2 flex-row items-center gap-2">
          <Icon name={iconName} size={16} color={iconColor} />
          <Text className="text-foreground text-sm">
            {actionLabel} shopping list{" "}
            {output.action !== "delete" ? (
              <Pressable
                onPress={() =>
                  handleShoppingListPress(output.result.id, output.result.name)
                }
              >
                <Text className="text-foreground font-medium underline">
                  "{output.result.name}"
                </Text>
              </Pressable>
            ) : (
              <Text className="font-medium">"{output.result.name}"</Text>
            )}
          </Text>
        </View>
      );

    case "group":
      return (
        <View className="my-2 flex-row items-center gap-2">
          <Icon name={iconName} size={16} color={iconColor} />
          <Text className="text-foreground text-sm">
            {actionLabel} group "{output.result.name}"
          </Text>
        </View>
      );
  }
}
