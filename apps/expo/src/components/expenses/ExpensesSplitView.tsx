import { Suspense, useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { SplitViewAction } from "../splitview/SplitViewContext";
import { SplitViewContainer } from "../splitview/SplitViewContainer";
import { useMediaQuery } from "../splitview/useMediaQuery";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useShoppingStore } from "~/utils/shopping-store";
import { ExpenseDetailPanel } from "./ExpenseDetailPanel";
import { ExpenseListPanel } from "./ExpenseListPanel";

export function ExpensesSplitView() {
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();
  const isLargeScreen = useMediaQuery("lg");

  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(
    null,
  );
  const [action, setAction] = useState<SplitViewAction>(null);

  const selectExpense = useCallback(
    (expenseId: number) => {
      if (isLargeScreen) {
        setSelectedExpenseId(expenseId);
        setAction("view");
      } else {
        router.push(`/(tabs)/expenses/${expenseId}`);
      }
    },
    [isLargeScreen, router],
  );

  const editExpense = useCallback(
    (expenseId: number) => {
      if (isLargeScreen) {
        setSelectedExpenseId(expenseId);
        setAction("edit");
      } else {
        router.push({
          pathname: "/(tabs)/expenses/[expenseId]/edit",
          params: { expenseId: expenseId.toString() },
        });
      }
    },
    [isLargeScreen, router],
  );

  const createExpense = useCallback(() => {
    if (isLargeScreen) {
      setSelectedExpenseId(null);
      setAction("create");
    } else {
      router.push("/(tabs)/expenses/create");
    }
  }, [isLargeScreen, router]);

  const clearSelection = useCallback(() => {
    setSelectedExpenseId(null);
    setAction(null);
  }, []);

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-4">
        <Icon name="receipt" size={48} color="muted-foreground" />
        <Text className="text-muted-foreground text-center text-lg font-semibold">
          Select a group to view its expenses
        </Text>
        <Button
          title="Manage Groups"
          variant="primary"
          size="lg"
          icon="arrow-left-right"
          onPress={() => router.push("/(tabs)/home")}
        />
      </View>
    );
  }

  const hasSelection = selectedExpenseId !== null || action === "create";

  const listContent = (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">
            Loading expenses...
          </Text>
        </View>
      }
    >
      <ExpenseListPanel
        selectedExpenseId={isLargeScreen ? selectedExpenseId : null}
        onSelectExpense={selectExpense}
        onCreateExpense={createExpense}
      />
    </Suspense>
  );

  const detailContent = (
    <ExpenseDetailPanel
      selectedExpenseId={selectedExpenseId}
      action={action}
      onBack={clearSelection}
      onSelectExpense={selectExpense}
      onEditExpense={editExpense}
    />
  );

  if (!isLargeScreen) {
    return listContent;
  }

  return (
    <SplitViewContainer
      listContent={listContent}
      detailContent={detailContent}
      hasSelection={hasSelection}
    />
  );
}
