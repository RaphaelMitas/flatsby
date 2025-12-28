import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";

interface ExpenseCardProps {
  expense: ExpenseWithSplitsAndMembers;
  groupId: number;
  onEdit: () => void;
  onDelete?: () => void;
}

export function ExpenseCard({
  expense,
  groupId,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpcClient = trpc;
  const swipeableRef = useRef<SwipeableMethods>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { selectedGroupId } = useShoppingStore();

  const expenseListQueryKey =
    trpcClient.expense.getGroupExpenses.infiniteQueryKey({
      groupId,
      limit: 20,
    });

  const deleteExpenseMutation = useMutation(
    trpcClient.expense.deleteExpense.mutationOptions({
      onMutate: async (input) => {
        // Cancel any outgoing queries
        await queryClient.cancelQueries(
          trpcClient.expense.getGroupExpenses.queryOptions({
            groupId,
            limit: 20,
          }),
        );

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(expenseListQueryKey);

        // Optimistically remove the expense from the list
        queryClient.setQueryData(expenseListQueryKey, (old) => {
          if (!old) return old;

          const updatedPages = old.pages.map((page) => {
            if (page.success === false) return page;

            return {
              ...page,
              data: {
                ...page.data,
                items: page.data.items.filter(
                  (item) => item.id !== input.expenseId,
                ),
              },
            };
          });

          return { ...old, pages: updatedPages };
        });

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(expenseListQueryKey, context.previousData);
        }
      },
      onSuccess: (data) => {
        if (data.success === false) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        if (selectedGroupId) {
          void queryClient.invalidateQueries(
            trpcClient.expense.getDebtSummary.queryOptions({
              groupId: selectedGroupId,
            }),
          );
        }
        onDelete?.();
      },
    }),
  );

  const splitCount = expense.expenseSplits.length;
  const paidByName = expense.paidByGroupMember.user.name;
  const formattedAmount = formatCurrencyFromCents({
    cents: expense.amountInCents,
    currency: expense.currency,
  });
  const expenseDate = new Date(expense.expenseDate);
  const formattedDate = expenseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      expenseDate.getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });

  const { renderLeftActions, renderRightActions } = useSwipeActions({
    leftAction: {
      text: "Edit",
      className: "bg-info",
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: "Delete",
      className: "bg-destructive",
      textClassName: "text-destructive-foreground",
    },
  });

  const handleCardPress = () => {
    router.push(`/(tabs)/expenses/${expense.id}`);
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    swipeableRef.current?.close();
    deleteExpenseMutation.mutate({ expenseId: expense.id });
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  const isOptimistic =
    expense.id === -1 ||
    ((expense as { isPending?: boolean }).isPending ?? false) ||
    deleteExpenseMutation.isPending;

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!isOptimistic}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          if (direction === SwipeDirection.RIGHT) {
            swipeableRef.current?.close();
            onEdit();
          } else {
            swipeableRef.current?.close();
            setShowDeleteModal(true);
          }
        }}
      >
        <TouchableOpacity
          className="bg-muted border-border rounded-lg border p-4"
          disabled={isOptimistic}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          <View className="flex-1 gap-3">
            {/* Header: Amount and Currency */}
            <View className="flex-row items-center gap-2">
              <Text className="text-foreground text-2xl font-bold">
                {formattedAmount}
              </Text>
              {expense.splitMethod === "settlement" && (
                <View className="bg-muted-foreground/20 rounded px-2 py-1">
                  <Text className="text-muted-foreground text-xs">
                    Settlement
                  </Text>
                </View>
              )}
            </View>
            {expense.description && (
              <Text
                className="text-foreground text-sm font-medium"
                numberOfLines={2}
              >
                {expense.description}
              </Text>
            )}

            {/* Details: Paid by, Split info, Date */}
            <View className="flex-col gap-2">
              <View className="flex-row items-center gap-2">
                {expense.splitMethod === "settlement" &&
                  expense.expenseSplits[0] && (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={
                            expense.expenseSplits[0].groupMember.user.image ??
                            undefined
                          }
                        />
                        <AvatarFallback className="text-xs">
                          {expense.expenseSplits[0].groupMember.user.name
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Text className="text-muted-foreground text-sm">
                        {expense.expenseSplits[0].groupMember.user.name}
                      </Text>
                      <Icon
                        name="arrow-right"
                        size={16}
                        color="muted-foreground"
                      />
                    </>
                  )}
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={expense.paidByGroupMember.user.image ?? undefined}
                  />
                  <AvatarFallback className="text-xs">
                    {paidByName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Text
                  className="text-muted-foreground text-sm"
                  numberOfLines={1}
                >
                  {`${expense.splitMethod === "settlement" ? "" : "Paid by "}${paidByName}`}
                </Text>
              </View>

              {expense.splitMethod !== "settlement" && (
                <View className="flex-row items-center gap-2">
                  <Icon name="users" size={16} color="muted-foreground" />
                  <Text className="text-muted-foreground text-sm">
                    Split between {splitCount}{" "}
                    {splitCount === 1 ? "person" : "people"}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center gap-2">
                <Icon name="calendar" size={16} color="muted-foreground" />
                <Text className="text-muted-foreground text-sm">
                  {formattedDate}
                </Text>
                {expense.category && (
                  <>
                    <Text className="text-muted-foreground text-sm">•</Text>
                    <Text className="text-muted-foreground text-sm capitalize">
                      {expense.category}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDelete}
        itemName={expense.description ?? formattedAmount}
        title="Delete Expense"
        description={`Are you sure you want to delete this ${expense.splitMethod === "settlement" ? "settlement" : "expense"}? This action cannot be undone.`}
        needsConfirmationInput={false}
      />
    </>
  );
}
