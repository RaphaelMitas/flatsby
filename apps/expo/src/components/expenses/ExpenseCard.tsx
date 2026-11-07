import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Alert, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { describeExpenseRow } from "@flatsby/validators/expenses/formatting";

import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";
import { ExpenseDisplay } from "./ExpenseDisplay";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface ExpenseCardProps {
  expense: ExpenseWithSplitsAndMembers;
  groupId: number;
  meId: number;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect: () => void;
  isNotConverted?: boolean;
}

export function ExpenseCard({
  expense,
  groupId,
  meId,
  first,
  last,
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

  const { cancelLists, patchLists, invalidateAll } =
    useInvalidateExpenses(groupId);

  const deleteExpenseMutation = useMutation(
    trpcClient.expense.deleteExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          await cancelLists();

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

  const row = describeExpenseRow(expense, { meId, isNotConverted }, t, locale);
  const accessibilityLabel = [
    row.title,
    row.category,
    row.payer,
    row.paid,
    row.date,
    row.amount,
    row.balance?.text,
  ]
    .filter(Boolean)
    .join(", ");

  const corners = cn(
    "rounded-none",
    first && "rounded-t-lg",
    last && "rounded-b-lg",
  );
  const { swipeableProps, guardPress } = useSwipeActions({
    leftAction: {
      text: t("common.edit"),
      className: cn("bg-info", corners),
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: t("common.delete"),
      className: cn("bg-destructive", corners),
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
          accessibilityLabel={accessibilityLabel}
          onPress={guardPress(onSelect)}
          disabled={isOptimistic}
        >
          <ExpenseDisplay
            row={row}
            subcategory={expense.subcategory}
            isSelected={isSelected}
            className={cn(corners, last && "border-b")}
          />
        </Pressable>
      </ReanimatedSwipeable>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDelete}
        itemName={row.title}
        title={t("expenses.deleteExpense")}
        description={
          row.isSettlement
            ? t("expenses.deleteSettlementConfirm")
            : t("expenses.deleteExpenseConfirm")
        }
      />
    </>
  );
}
