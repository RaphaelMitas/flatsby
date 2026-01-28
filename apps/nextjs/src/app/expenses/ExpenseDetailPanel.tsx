"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Receipt } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@flatsby/ui/alert-dialog";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import { toast } from "@flatsby/ui/toast";

import type { ExpenseAction } from "./useExpenseSelection";
import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { ExpenseDetailContent } from "./ExpenseDetailContent";
import { ExpenseFormInline } from "./ExpenseFormInline";

interface ExpenseDetailPanelProps {
  selectedExpenseId: number | null;
  action: ExpenseAction | null;
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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { currentGroup } = useGroupContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const groupId = currentGroup?.id ?? 0;

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const expenseListQueryKey = trpc.expense.getGroupExpenses.infiniteQueryKey({
    groupId,
    limit: 20,
  });

  const deleteExpenseMutation = useMutation(
    trpc.expense.deleteExpense.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries(
          trpc.expense.getGroupExpenses.queryOptions({
            groupId,
            limit: 20,
          }),
        );

        const previousData = queryClient.getQueryData(expenseListQueryKey);

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
        toast.error("Failed to delete expense", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context.previousData) {
            queryClient.setQueryData(expenseListQueryKey, context.previousData);
          }
          toast.error("Failed to delete expense", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Expense deleted successfully");
        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId }),
        );
        onBack();
      },
    }),
  );

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  // Show create form
  if (action === "create") {
    return (
      <ExpenseFormInline
        group={groupData.data}
        onClose={onBack}
        onSuccess={(expenseId) => onSelectExpense(expenseId)}
      />
    );
  }

  // Show expense detail or edit form
  if (selectedExpenseId) {
    return (
      <ExpenseDetailPanelContent
        expenseId={selectedExpenseId}
        action={action}
        groupData={groupData}
        onBack={onBack}
        onEdit={() => onEditExpense(selectedExpenseId)}
        onDelete={() => setShowDeleteDialog(true)}
        isDeleting={deleteExpenseMutation.isPending}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        handleDelete={() => {
          deleteExpenseMutation.mutate({ expenseId: selectedExpenseId });
          setShowDeleteDialog(false);
        }}
        onSelectExpense={onSelectExpense}
      />
    );
  }

  // Empty state
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Receipt className="text-muted-foreground h-16 w-16" />
      <div>
        <p className="text-lg font-semibold">Select an expense</p>
        <p className="text-muted-foreground text-sm">
          Choose an expense from the list to view details
        </p>
      </div>
    </div>
  );
}

interface ExpenseDetailPanelContentProps {
  expenseId: number;
  action: ExpenseAction | null;
  groupData: {
    success: true;
    data: Parameters<typeof ExpenseFormInline>[0]["group"];
  };
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  handleDelete: () => void;
  onSelectExpense: (expenseId: number) => void;
}

function ExpenseDetailPanelContent({
  expenseId,
  action,
  groupData,
  onBack,
  onEdit,
  onDelete,
  isDeleting,
  showDeleteDialog,
  setShowDeleteDialog,
  handleDelete,
  onSelectExpense,
}: ExpenseDetailPanelContentProps) {
  const trpc = useTRPC();

  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (!expenseData.success) {
    return handleApiError(expenseData.error);
  }

  const expense = expenseData.data;

  // Show inline edit form
  if (action === "edit") {
    return (
      <ExpenseFormInline
        group={groupData.data}
        expense={expense}
        onClose={onBack}
        onSuccess={(id) => onSelectExpense(id)}
      />
    );
  }

  // Show detail view
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4">
          <ExpenseDetailContent
            expense={expense}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <LoadingSpinner /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
