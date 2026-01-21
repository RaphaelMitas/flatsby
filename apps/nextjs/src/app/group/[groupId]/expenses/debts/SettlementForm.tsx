"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { SettlementFormValues } from "@flatsby/validators/expenses/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flatsby/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@flatsby/ui/sheet";
import { toast } from "@flatsby/ui/toast";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { settlementFormSchema } from "@flatsby/validators/expenses/schemas";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";

import { CurrencyInput } from "~/components/CurrencyInput";
import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

interface SettlementFormProps {
  groupId: number;
  fromGroupMemberId: number;
  toGroupMemberId: number;
  currency: string;
  amount: number | undefined;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  open: boolean;
}

export function SettlementForm({
  groupId,
  fromGroupMemberId,
  toGroupMemberId,
  currency,
  amount,
  expense,
  onClose,
  open,
}: SettlementFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isEditMode = !!expense;

  // Get group members for display
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      amountInCents: expense?.amountInCents ?? amount ?? 0,
      fromGroupMemberId: fromGroupMemberId,
      toGroupMemberId: toGroupMemberId,
      currency: isCurrencyCode(currency) ? currency : "EUR",
    },
  });

  // Query key for expense list
  const expenseListQueryKey = trpc.expense.getGroupExpenses.infiniteQueryKey({
    groupId,
    limit: 20,
  });

  const expenseQueryKey = expense
    ? trpc.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  // Get group data early for optimistic updates
  const membersForOptimistic = groupData.success
    ? groupData.data.groupMembers
    : [];
  const currentMember = groupData.success
    ? groupData.data.thisGroupMember
    : null;

  const createSettlementMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
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

        // Get the paidBy and toMember for the optimistic settlement
        const paidByMember = membersForOptimistic.find(
          (m) => m.id === input.paidByGroupMemberId,
        );
        const splitMember = membersForOptimistic.find(
          (m) => m.id === input.splits[0]?.groupMemberId,
        );

        // Optimistically add the new settlement
        queryClient.setQueryData(expenseListQueryKey, (old) => {
          if (!old) return old;

          const optimisticSettlement = {
            id: Date.now(),
            groupId,
            paidByGroupMemberId: input.paidByGroupMemberId,
            amountInCents: input.amountInCents,
            currency: input.currency,
            description: input.description ?? null,
            category: null,
            expenseDate: input.expenseDate,
            createdByGroupMemberId: currentMember?.id ?? 0,
            splitMethod: "settlement",
            createdAt: new Date(),
            updatedAt: new Date(),
            paidByGroupMember: paidByMember
              ? {
                  id: paidByMember.id,
                  groupId,
                  userId: paidByMember.userId,
                  role: paidByMember.role,
                  joinedOn: paidByMember.joinedOn,
                  user: paidByMember.user,
                }
              : {
                  id: input.paidByGroupMemberId,
                  groupId,
                  userId: "",
                  role: "member" as const,
                  joinedOn: new Date(),
                  user: { email: "", name: "Unknown", image: null },
                },
            createdByGroupMember: currentMember
              ? {
                  id: currentMember.id,
                  groupId,
                  userId: currentMember.userId,
                  role: currentMember.role,
                  joinedOn: currentMember.joinedOn,
                  user: currentMember.user,
                }
              : {
                  id: 0,
                  groupId,
                  userId: "",
                  role: "member" as const,
                  joinedOn: new Date(),
                  user: { email: "", name: "Unknown", image: null },
                },
            expenseSplits: input.splits.map((split, index) => ({
              id: Date.now() + index,
              createdAt: new Date(),
              expenseId: Date.now(),
              groupMemberId: split.groupMemberId,
              amountInCents: split.amountInCents,
              percentage: split.percentage,
              groupMember: splitMember
                ? {
                    id: splitMember.id,
                    groupId,
                    userId: splitMember.userId,
                    role: splitMember.role,
                    joinedOn: splitMember.joinedOn,
                    user: splitMember.user,
                  }
                : {
                    id: split.groupMemberId,
                    groupId,
                    userId: "",
                    role: "member" as const,
                    joinedOn: new Date(),
                    user: { email: "", name: "Unknown", image: null },
                  },
            })),
            isPending: true,
          };

          const updatedPages = old.pages.map((page, pageIndex) => {
            if (page.success === false) return page;
            if (pageIndex !== 0) return page;

            return {
              ...page,
              data: {
                ...page.data,
                items: [optimisticSettlement, ...page.data.items],
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
        toast.error("Failed to record settlement", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context.previousData) {
            queryClient.setQueryData(expenseListQueryKey, context.previousData);
          }
          toast.error("Failed to record settlement", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Settlement recorded successfully");
        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId }),
        );
        onClose();
        form.reset();
      },
    }),
  );

  const updateSettlementMutation = useMutation(
    trpc.expense.updateExpense.mutationOptions({
      onMutate: async (input) => {
        if (!expense || !expenseQueryKey) return;
        // Cancel any outgoing queries
        await queryClient.cancelQueries(
          trpc.expense.getExpense.queryOptions({
            expenseId: expense.id,
          }),
        );

        const previousData = queryClient.getQueryData(expenseQueryKey);

        // Optimistically update the settlement in the list
        queryClient.setQueryData(expenseQueryKey, (old) => {
          if (!old || old.success === false) return old;

          const updatedExpense = {
            ...old,
            data: {
              ...old.data,
              ...input,
            },
          };

          return updatedExpense;
        });

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData && expenseQueryKey) {
          queryClient.setQueryData(expenseQueryKey, context.previousData);
        }
        toast.error("Failed to update settlement", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context?.previousData && expenseQueryKey) {
            queryClient.setQueryData(expenseQueryKey, context.previousData);
          }
          toast.error("Failed to update settlement", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Settlement updated successfully");
        void queryClient.invalidateQueries({
          queryKey: expenseQueryKey,
        });

        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId }),
        );
        onClose();
      },
    }),
  );

  const onSubmit = (values: SettlementFormValues) => {
    if (isEditMode) {
      updateSettlementMutation.mutate({
        expenseId: expense.id,
        paidByGroupMemberId: fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: isCurrencyCode(currency) ? currency : "EUR",
        expenseDate: expense.expenseDate,
        splits: [
          {
            groupMemberId: toGroupMemberId,
            amountInCents: values.amountInCents,
            percentage: null,
          },
        ],
        splitMethod: "settlement",
      });
    } else {
      createSettlementMutation.mutate({
        groupId,
        paidByGroupMemberId: fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: isCurrencyCode(currency) ? currency : "EUR",
        expenseDate: new Date(),
        splits: [
          {
            groupMemberId: toGroupMemberId,
            amountInCents: values.amountInCents,
            percentage: null,
          },
        ],
        splitMethod: "settlement",
      });
    }
  };

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const groupMembers = groupData.data.groupMembers;
  const fromMember = groupMembers.find((m) => m.id === fromGroupMemberId);
  const toMember = groupMembers.find((m) => m.id === toGroupMemberId);
  const fromName = fromMember?.user.name ?? "Unknown";
  const toName = toMember?.user.name ?? "Unknown";

  const isPending =
    createSettlementMutation.isPending || updateSettlementMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Edit Settlement" : "Settle Up"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-6"
          >
            {/* Settlement Info */}
            <div className="space-y-4">
              <div className="bg-muted flex items-center justify-between rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={fromName}
                    image={fromMember?.user.image}
                    size="md"
                  />
                  <div>
                    <p className="text-muted-foreground text-sm">Paying</p>
                    <p className="font-semibold">{fromName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">Receiving</p>
                  <p className="font-semibold">{toName}</p>
                </div>
              </div>

              {amount && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-muted-foreground mb-1 text-sm">
                    Outstanding debt
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrencyFromCents({
                      cents: amount,
                      currency,
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <FormField
              control={form.control}
              name="amountInCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Settlement Amount</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{currency}</span>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0.00"
                        min={1}
                        max={amount}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Display */}
            {(createSettlementMutation.isError ||
              updateSettlementMutation.isError ||
              createSettlementMutation.data?.success === false ||
              updateSettlementMutation.data?.success === false) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {createSettlementMutation.data?.success === false
                    ? createSettlementMutation.data.error.message
                    : updateSettlementMutation.data?.success === false
                      ? updateSettlementMutation.data.error.message
                      : (createSettlementMutation.error?.message ??
                        updateSettlementMutation.error?.message ??
                        "An error occurred")}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Recording..."}
                  </>
                ) : isEditMode ? (
                  "Update Settlement"
                ) : (
                  "Record Settlement"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
