import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function CreateExpense() {
  const { selectedGroupId } = useShoppingStore();
  const t = useTranslations();

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted-foreground text-center">
          {t("common.noGroupSelectedHint")}
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
            {t("expenses.loadingGroupData")}
          </Text>
        </View>
      }
    >
      <CreateExpenseInner selectedGroupId={selectedGroupId} />
    </Suspense>
  );
}

function CreateExpenseInner({ selectedGroupId }: { selectedGroupId: number }) {
  const t = useTranslations();
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId }),
  );

  if (!groupData.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {t("expenses.failedToLoadGroup")}
        </Text>
      </View>
    );
  }

  return <ExpenseForm group={groupData.data} />;
}
