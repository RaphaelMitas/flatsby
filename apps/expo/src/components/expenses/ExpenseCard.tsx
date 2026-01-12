import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";
import { ExpenseDisplay } from "./ExpenseDisplay";

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
  const fromMember = expense.expenseSplits[0]?.groupMember;

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
        <Pressable onPress={handleCardPress} disabled={isOptimistic}>
          <ExpenseDisplay
            amountInCents={expense.amountInCents}
            currency={expense.currency}
            description={expense.description}
            paidByName={paidByName}
            paidByImage={expense.paidByGroupMember.user.image}
            expenseDate={expenseDate}
            splitMethod={expense.splitMethod}
            splitCount={splitCount}
            category={expense.category}
            fromName={fromMember?.user.name}
            fromImage={fromMember?.user.image}
          />
        </Pressable>
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
