import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function CreateExpense() {
  const { selectedGroupId } = useShoppingStore();

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
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">
            Loading group data...
          </Text>
        </View>
      }
    >
      <CreateExpenseInner selectedGroupId={selectedGroupId} />
    </Suspense>
  );
}

function CreateExpenseInner({ selectedGroupId }: { selectedGroupId: number }) {
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId }),
  );

  if (!groupData.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          Failed to load group data
        </Text>
      </View>
    );
  }

  return <ExpenseForm group={groupData.data} />;
}
