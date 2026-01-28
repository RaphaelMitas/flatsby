import type { SplitViewAction } from "../splitview/SplitViewContext";
import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import Icon from "~/lib/ui/custom/icons/Icon";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { ExpenseDetailView } from "./ExpenseDetailView";
import { ExpenseForm } from "./ExpenseForm";

interface ExpenseDetailPanelProps {
  selectedExpenseId: number | null;
  action: SplitViewAction;
  onBack: () => void;
  onSelectExpense: (expenseId: number) => void;
  onEditExpense: (expenseId: number) => void;
}

export function ExpenseDetailPanel({
  selectedExpenseId,
  action,
  onBack,
  onSelectExpense,
  onEditExpense,
}: ExpenseDetailPanelProps) {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedExpenseId && action !== "create") {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Icon name="receipt" size={64} color="muted-foreground" />
        <View className="items-center gap-2">
          <Text className="text-foreground text-lg font-semibold">
            Select an expense
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            Choose an expense from the list to view details
          </Text>
        </View>
      </View>
    );
  }

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Icon name="circle-alert" size={64} color="muted-foreground" />
        <Text className="text-muted-foreground text-center">
          No group selected
        </Text>
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">Loading...</Text>
        </View>
      }
    >
      <ExpenseDetailPanelContent
        selectedExpenseId={selectedExpenseId}
        action={action}
        groupId={selectedGroupId}
        onBack={onBack}
        onSelectExpense={onSelectExpense}
        onEditExpense={onEditExpense}
      />
    </Suspense>
  );
}

interface ExpenseDetailPanelContentProps {
  selectedExpenseId: number | null;
  action: SplitViewAction;
  groupId: number;
  onBack: () => void;
  onSelectExpense: (expenseId: number) => void;
  onEditExpense: (expenseId: number) => void;
}

function ExpenseDetailPanelContent({
  selectedExpenseId,
  action,
  groupId,
  onBack,
  onSelectExpense,
  onEditExpense,
}: ExpenseDetailPanelContentProps) {
  const router = useRouter();
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!groupData.success) {
    return handleApiError({
      router,
      error: groupData.error,
    });
  }

  if (action === "create") {
    return (
      <View className="flex-1">
        <ExpenseForm
          group={groupData.data}
          onClose={onBack}
          onSuccess={(expenseId) => onSelectExpense(expenseId)}
        />
      </View>
    );
  }

  if (action === "edit" && selectedExpenseId) {
    return (
      <ExpenseEditPanelContent
        expenseId={selectedExpenseId}
        groupData={groupData}
        onBack={onBack}
        onSelectExpense={onSelectExpense}
      />
    );
  }

  if (selectedExpenseId) {
    return (
      <View className="flex-1 p-4">
        <ExpenseDetailView
          expenseId={selectedExpenseId}
          groupId={groupId}
          onBack={onBack}
          onEdit={() => onEditExpense(selectedExpenseId)}
        />
      </View>
    );
  }

  return null;
}

interface ExpenseEditPanelContentProps {
  expenseId: number;
  groupData: {
    success: true;
    data: Parameters<typeof ExpenseForm>[0]["group"];
  };
  onBack: () => void;
  onSelectExpense: (expenseId: number) => void;
}

function ExpenseEditPanelContent({
  expenseId,
  groupData,
  onBack,
  onSelectExpense,
}: ExpenseEditPanelContentProps) {
  const router = useRouter();
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (!expenseData.success) {
    return handleApiError({
      router,
      error: expenseData.error,
    });
  }

  return (
    <View className="flex-1">
      <ExpenseForm
        group={groupData.data}
        expense={expenseData.data}
        onClose={onBack}
        onSuccess={(id) => onSelectExpense(id)}
      />
    </View>
  );
}
