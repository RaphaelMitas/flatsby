"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Calendar, Edit, Trash2, Users } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Separator } from "@flatsby/ui/separator";
import { toast } from "@flatsby/ui/toast";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { SettlementForm } from "../debts/SettlementForm";
import { ExpenseForm } from "../ExpenseForm";

interface ExpenseDetailViewProps {
  expenseId: number;
  groupId: number;
}

export function ExpenseDetailView({
  expenseId,
  groupId,
}: ExpenseDetailViewProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  // Query key for expense list
  const expenseListQueryKey = trpc.expense.getGroupExpenses.infiniteQueryKey({
    groupId,
    limit: 20,
  });

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  const deleteExpenseMutation = useMutation(
    trpc.expense.deleteExpense.mutationOptions({
      onMutate: async (input) => {
        // Cancel any outgoing queries
        await queryClient.cancelQueries(
          trpc.expense.getGroupExpenses.queryOptions({
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
        router.push(`/group/${groupId}/expenses`);
      },
    }),
  );

  const handleDelete = () => {
    deleteExpenseMutation.mutate({ expenseId });
    setShowDeleteDialog(false);
  };

  if (!expenseData.success) {
    return handleApiError(expenseData.error);
  }

  const expense = expenseData.data;
  const formattedAmount = formatCurrencyFromCents({
    cents: expense.amountInCents,
    currency: expense.currency,
  });
  const expenseDate = new Date(expense.expenseDate);
  const formattedDate = expenseDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex w-full max-w-prose flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="md:hidden"
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowEditForm(true)}
            disabled={deleteExpenseMutation.isPending}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteExpenseMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{formattedAmount}</CardTitle>
              {expense.description && (
                <CardDescription className="mt-2 text-base">
                  {expense.description}
                </CardDescription>
              )}
            </div>
            {expense.splitMethod === "settlement" && (
              <span className="bg-muted-foreground/20 text-muted-foreground rounded px-3 py-1 text-xs">
                Settlement
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {expense.splitMethod === "settlement" && expense.expenseSplits[0] && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    alt={expense.expenseSplits[0].groupMember.user.name}
                    src={
                      expense.expenseSplits[0].groupMember.user.image ??
                      undefined
                    }
                  />
                  <AvatarFallback>
                    {expense.expenseSplits[0].groupMember.user.name
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-muted-foreground text-sm">From</p>
                  <p className="font-semibold">
                    {expense.expenseSplits[0].groupMember.user.name}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                alt={expense.paidByGroupMember.user.name}
                src={expense.paidByGroupMember.user.image ?? undefined}
              />
              <AvatarFallback>
                {expense.paidByGroupMember.user.name
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm">
                {expense.splitMethod === "settlement" ? "To" : "Paid by"}
              </p>
              <p className="font-semibold">
                {expense.paidByGroupMember.user.name}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm">Date</p>
              <p className="font-semibold">{formattedDate}</p>
            </div>
          </div>

          {expense.category && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm">Category</p>
                <p className="font-semibold capitalize">{expense.category}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {expense.splitMethod !== "settlement" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Split Details
            </CardTitle>
            <CardDescription>
              {`Split between ${expense.expenseSplits.length} ${expense.expenseSplits.length === 1 ? "person" : "people"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expense.expenseSplits.map((split, index) => {
                const member = split.groupMember;
                const splitAmount = formatCurrencyFromCents({
                  cents: split.amountInCents,
                  currency: expense.currency,
                });
                const percentage =
                  (split.amountInCents / expense.amountInCents) * 100;

                return (
                  <div key={split.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            alt={member.user.name}
                            src={member.user.image ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {member.user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{splitAmount}</p>
                    </div>
                    {index < expense.expenseSplits.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                alt={expense.createdByGroupMember.user.name}
                src={expense.createdByGroupMember.user.image ?? undefined}
              />
              <AvatarFallback className="text-xs">
                {expense.createdByGroupMember.user.name
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm">Created by</p>
              <p className="text-sm font-medium">
                {expense.createdByGroupMember.user.name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              disabled={deleteExpenseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExpenseMutation.isPending ? <LoadingSpinner /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEditForm && groupData.success ? (
        expense.splitMethod === "settlement" ? (
          <SettlementForm
            groupId={groupId}
            fromGroupMemberId={expense.paidByGroupMemberId}
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            toGroupMemberId={expense.expenseSplits[0]!.groupMemberId}
            currency={expense.currency}
            outstandingDebtInCents={
              debtData.success
                ? (() => {
                    const currencyData =
                      debtData.data.currencies[expense.currency];

                    if (!currencyData) return undefined;

                    const debt = currencyData.debts.find(
                      (debt) =>
                        debt.fromGroupMemberId === expense.paidByGroupMemberId,
                    );

                    if (!debt || typeof debt.amountInCents !== "number")
                      return undefined;

                    return debt.amountInCents + expense.amountInCents;
                  })()
                : undefined
            }
            expense={expense}
            onClose={() => setShowEditForm(false)}
            open={showEditForm}
          />
        ) : (
          <ExpenseForm
            group={groupData.data}
            expense={expense}
            onClose={() => setShowEditForm(false)}
            open={showEditForm}
          />
        )
      ) : null}
    </div>
  );
}
