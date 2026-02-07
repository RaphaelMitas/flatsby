import type { SearchDataOutput } from "@flatsby/validators/chat/tools";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { DebtDisplay } from "~/components/expenses/DebtDisplay";
import { ShoppingItemDisplay } from "~/components/shoppingList/ShoppingItemDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useShoppingStore } from "~/utils/shopping-store";

interface SearchDataResultProps {
  output: SearchDataOutput;
}

export function SearchDataResult({ output }: SearchDataResultProps) {
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

  const { data, metadata } = output;

  switch (data.type) {
    case "shoppingLists":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name="list" size={16} color="foreground" />
              <CardTitle className="text-sm font-medium">
                Shopping Lists
              </CardTitle>
              <Text className="text-muted-foreground text-sm">
                ({metadata.count} lists)
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="gap-2">
              {data.items.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => handleShoppingListPress(list.id, list.name)}
                  className="active:bg-muted flex-row items-center justify-between rounded-md p-2"
                >
                  <Text className="text-foreground font-medium">
                    {list.name}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {list.uncheckedItemCount} items
                  </Text>
                </Pressable>
              ))}
            </View>
          </CardContent>
        </Card>
      );

    case "shoppingListItems":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name="list" size={16} color="foreground" />
              <CardTitle className="text-sm font-medium">
                {data.listName}
              </CardTitle>
              <Text className="text-muted-foreground text-sm">
                ({metadata.count} items)
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollView className="max-h-64" showsVerticalScrollIndicator>
              <View className="gap-2">
                {data.items.map((item) => (
                  <ShoppingItemDisplay
                    key={item.id}
                    name={item.name}
                    completed={item.completed}
                    categoryId={item.categoryId}
                  />
                ))}
              </View>
            </ScrollView>
          </CardContent>
        </Card>
      );

    case "expenses":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name="wallet" size={16} color="foreground" />
              <CardTitle className="text-sm font-medium">
                Recent Expenses
              </CardTitle>
              <Text className="text-muted-foreground text-sm">
                ({metadata.count} expenses)
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollView className="max-h-72" showsVerticalScrollIndicator>
              <View className="gap-2">
                {data.items.map((expense) => (
                  <View
                    key={expense.id}
                    className="border-border rounded-md border p-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-foreground font-medium">
                        {expense.description ?? "Expense"}
                      </Text>
                      <Text className="text-foreground font-medium">
                        {formatCurrencyFromCents({
                          cents: expense.amountInCents,
                          currency: expense.currency,
                        })}
                      </Text>
                    </View>
                    <Text className="text-muted-foreground mt-1 text-sm">
                      Paid by {expense.paidByMemberName}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </CardContent>
        </Card>
      );

    case "groupMembers":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name="users" size={16} color="foreground" />
              <CardTitle className="text-sm font-medium">
                Group Members
              </CardTitle>
              <Text className="text-muted-foreground text-sm">
                ({metadata.count} members)
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            <View className="gap-2">
              {data.items.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2">
                    {member.image ? (
                      <Image
                        source={{ uri: member.image }}
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <View className="bg-muted h-6 w-6 items-center justify-center rounded-full">
                        <Text className="text-foreground text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text className="text-foreground font-medium">
                      {member.name}
                      {member.isCurrentUser && (
                        <Text className="text-muted-foreground ml-1 text-sm">
                          {" "}
                          (you)
                        </Text>
                      )}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground text-sm capitalize">
                    {member.role}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      );

    case "debts":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name="wallet" size={16} color="foreground" />
              <CardTitle className="text-sm font-medium">
                Debts in {metadata.groupName}
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.length === 0 ? (
              <View className="flex-row items-center gap-2">
                <Icon name="circle-check" size={16} color="success" />
                <Text className="text-muted-foreground text-sm">
                  All settled up!
                </Text>
              </View>
            ) : (
              <View className="gap-1">
                {data.items.map((debt, i) => (
                  <DebtDisplay
                    key={i}
                    fromMember={debt.fromMemberName}
                    toMember={debt.toMemberName}
                    amountInCents={debt.amountInCents}
                    currency={debt.currency}
                  />
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      );

    case "groups":
      return (
        <Card className="my-2">
          <CardHeader className="pb-2">
            <View className="flex-row items-center gap-2">
              <Icon name="users" size={16} color="foreground" />
              <CardTitle className="text-sm font-medium">Group Info</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.map((group) => (
              <View key={group.id} className="gap-1">
                <Text className="text-foreground font-medium">
                  {group.name}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {group.memberCount} members
                  {group.isCurrentUserAdmin && " (you're admin)"}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>
      );
  }
}
