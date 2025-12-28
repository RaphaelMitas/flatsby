import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ExpenseDetailView } from "~/components/expenses/ExpenseDetailView";
import { useShoppingStore } from "~/utils/shopping-store";

export default function ExpenseDetailPage() {
  const params = useLocalSearchParams<{ expenseId: string }>();
  const expenseId = params.expenseId ? parseInt(params.expenseId) : null;
  const { selectedGroupId } = useShoppingStore();

  if (!expenseId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">No expense ID provided</Text>
      </View>
    );
  }

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">No group selected</Text>
      </View>
    );
  }

  return <ExpenseDetailView expenseId={expenseId} groupId={selectedGroupId} />;
}
