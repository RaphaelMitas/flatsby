import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function EditExpensePage() {
  const { selectedGroupId } = useShoppingStore();
  const params = useLocalSearchParams<{ expenseId: string }>();
  const expenseId = parseInt(params.expenseId);

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted-foreground text-center">
          No group selected. Please select a group first.
        </Text>
      </View>
    );
  }
  return (
    <Suspense
      fallback={
        <SafeAreaView>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">
              Loading expense data...
            </Text>
          </View>
        </SafeAreaView>
      }
    >
      <EditExpensePageInner
        selectedGroupId={selectedGroupId}
        expenseId={expenseId}
      />
    </Suspense>
  );
}

function EditExpensePageInner({
  selectedGroupId,
  expenseId,
}: {
  selectedGroupId: number;
  expenseId: number;
}) {
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId }),
  );
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (!groupData.success) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-destructive text-center">
            Failed to load group data
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!expenseData.success) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-destructive text-center">
            Failed to load expense data
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <ExpenseForm group={groupData.data} expense={expenseData.data} />
    </SafeAreaView>
  );
}
