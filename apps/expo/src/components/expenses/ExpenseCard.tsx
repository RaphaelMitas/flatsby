import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Alert, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PostHogMaskView } from "posthog-react-native";
import { useLocale, useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import {
  formatExpenseAmounts,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";

import { trpc } from "~/utils/api";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";
import { ExpenseDisplay } from "./ExpenseDisplay";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface ExpenseCardProps {
  expense: ExpenseWithSplitsAndMembers;
  groupId: number;
  onEdit: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect: () => void;
  isNotConverted?: boolean;
}

export function ExpenseCard({
  expense,
  groupId,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  isNotConverted,
}: ExpenseCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const trpcClient = trpc;
  const swipeableRef = useRef<SwipeableMethods>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { expenseListQueryKey, patchLists, invalidateAll } =
    useInvalidateExpenses(groupId);

  const deleteExpenseMutation = useMutation(
    trpcClient.expense.deleteExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          // Cancel any outgoing queries
          await queryClient.cancelQueries({ queryKey: expenseListQueryKey });

          // Optimistically remove the expense from the list
          const listSnapshot = patchLists((old) => {
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

          return listSnapshot;
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          Alert.alert(
            t("expenses.deleteFailed"),
            message ?? t("errors.unexpected"),
          ),
        onSuccess: () => {
          invalidateAll();
          onDelete?.();
        },
      }),
    ),
  );

  const splitCount = expense.expenseSplits.length;
  const amounts = formatExpenseAmounts(expense, locale);
  const expenseDate = new Date(expense.expenseDate);
  const fromMember = expense.expenseSplits[0]?.groupMember;

  const { swipeableProps, guardPress } = useSwipeActions({
    leftAction: {
      text: t("common.edit"),
      className: "bg-info",
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: t("common.delete"),
      className: "bg-destructive",
      textClassName: "text-destructive-foreground",
    },
  });

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
      <PostHogMaskView>
        <ReanimatedSwipeable
          ref={swipeableRef}
          enabled={!isOptimistic}
          friction={2}
          leftThreshold={40}
          rightThreshold={40}
          {...swipeableProps}
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
          <Pressable
            testID={`expense-card-${expense.description}`}
            accessible={e2eAccessibilityOverride()}
            onPress={guardPress(onSelect)}
            disabled={isOptimistic}
          >
            <ExpenseDisplay
              amounts={amounts}
              isNotConverted={isNotConverted}
              description={expense.description}
              paidBy={memberPerson(expense.paidByGroupMember)}
              expenseDate={expenseDate}
              splitMethod={expense.splitMethod}
              splitCount={splitCount}
              subcategory={expense.subcategory}
              from={fromMember && memberPerson(fromMember)}
              isSelected={isSelected}
            />
          </Pressable>
        </ReanimatedSwipeable>
      </PostHogMaskView>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDelete}
        itemName={expense.description || amounts.amount}
        title={t("expenses.deleteExpense")}
        description={
          expense.splitMethod === "settlement"
            ? t("expenses.deleteSettlementConfirm")
            : t("expenses.deleteExpenseConfirm")
        }
      />
    </>
  );
}
