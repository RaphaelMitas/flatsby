"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { SplitMethod } from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

import { toast } from "@flatsby/ui/toast";
import {
  calculateEvenPercentageBasisPoints,
  distributeEqualAmounts,
  distributePercentageAmounts,
} from "@flatsby/validators/expenses/distribution";
import { expenseSchemaWithValidateSplits } from "@flatsby/validators/expenses/schemas";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";

import { useTRPC } from "~/trpc/react";

interface UseExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  onSuccess?: (expenseId: number) => void;
}

export function useExpenseForm({
  group,
  expense,
  onClose,
  onSuccess,
}: UseExpenseFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const isEditMode = !!expense;
  const totalSteps = 3;

  const expenseListQueryKey = trpc.expense.getGroupExpenses.infiniteQueryKey({
    groupId: group.id,
    limit: 20,
  });

  const expenseQueryKey = expense
    ? trpc.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  const initialSplitMethod: SplitMethod =
    expense?.splitMethod === "equal" ||
    expense?.splitMethod === "percentage" ||
    expense?.splitMethod === "custom"
      ? expense.splitMethod
      : "equal";

  const form = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchemaWithValidateSplits),
    defaultValues: {
      paidByGroupMemberId:
        expense?.paidByGroupMemberId ?? group.thisGroupMember.id,
      amountInCents: expense?.amountInCents ?? 0,
      currency:
        expense && isCurrencyCode(expense.currency) ? expense.currency : "EUR",
      description: expense?.description ?? "",
      category: expense?.category ?? "",
      expenseDate: expense?.expenseDate
        ? new Date(expense.expenseDate)
        : new Date(),
      splitMethod: initialSplitMethod,
      splits:
        expense?.expenseSplits.map((split) => ({
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
        })) ?? [],
    },
  });

  const splitMethod = useWatch({ control: form.control, name: "splitMethod" });
  const amountInCents = useWatch({
    control: form.control,
    name: "amountInCents",
  });
  const currency = useWatch({ control: form.control, name: "currency" });
  const paidByGroupMemberId = useWatch({
    control: form.control,
    name: "paidByGroupMemberId",
  });
  const description = useWatch({ control: form.control, name: "description" });
  const splits = useWatch({ control: form.control, name: "splits" });

  const createExpenseMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries(
          trpc.expense.getGroupExpenses.queryOptions({
            groupId: group.id,
            limit: 20,
          }),
        );

        const previousData = queryClient.getQueryData(
          trpc.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
        );

        const paidByMember = group.groupMembers.find(
          (m) => m.id === input.paidByGroupMemberId,
        );
        const currentMember = group.thisGroupMember;

        queryClient.setQueryData(
          trpc.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
          (old) => {
            if (!old) return old;

            const optimisticExpense = {
              id: Date.now(),
              groupId: group.id,
              paidByGroupMemberId: input.paidByGroupMemberId,
              amountInCents: input.amountInCents,
              currency: input.currency,
              description: input.description ?? null,
              category: input.category ?? null,
              expenseDate: input.expenseDate,
              createdByGroupMemberId: currentMember.id,
              splitMethod: input.splitMethod,
              createdAt: new Date(),
              updatedAt: new Date(),
              paidByGroupMember: paidByMember
                ? {
                    id: paidByMember.id,
                    groupId: group.id,
                    userId: paidByMember.userId,
                    role: paidByMember.role,
                    joinedOn: paidByMember.joinedOn,
                    user: paidByMember.user,
                  }
                : {
                    id: input.paidByGroupMemberId,
                    groupId: group.id,
                    userId: "",
                    role: "member" as const,
                    joinedOn: new Date(),
                    user: { email: "", name: "Unknown", image: null },
                  },
              createdByGroupMember: {
                id: currentMember.id,
                groupId: group.id,
                userId: currentMember.userId,
                role: currentMember.role,
                joinedOn: currentMember.joinedOn,
                user: currentMember.user,
              },
              expenseSplits: input.splits.map((split, index) => {
                const member = group.groupMembers.find(
                  (m) => m.id === split.groupMemberId,
                );
                return {
                  id: Date.now() + index,
                  createdAt: new Date(),
                  expenseId: Date.now(),
                  groupMemberId: split.groupMemberId,
                  amountInCents: split.amountInCents,
                  percentage: split.percentage,
                  groupMember: member
                    ? {
                        id: member.id,
                        groupId: group.id,
                        userId: member.userId,
                        role: member.role,
                        joinedOn: member.joinedOn,
                        user: member.user,
                      }
                    : {
                        id: split.groupMemberId,
                        groupId: group.id,
                        userId: "",
                        role: "member" as const,
                        joinedOn: new Date(),
                        user: { email: "", name: "Unknown", image: null },
                      },
                };
              }),
              isPending: true,
            };

            const updatedPages = old.pages.map((page, pageIndex) => {
              if (page.success === false) return page;
              if (pageIndex !== 0) return page;

              return {
                ...page,
                data: {
                  ...page.data,
                  items: [optimisticExpense, ...page.data.items],
                },
              };
            });

            return { ...old, pages: updatedPages };
          },
        );

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(expenseListQueryKey, context.previousData);
        }
        toast.error("Failed to create expense", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context.previousData) {
            queryClient.setQueryData(expenseListQueryKey, context.previousData);
          }
          toast.error("Failed to create expense", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Expense created successfully");
        void queryClient.invalidateQueries({
          queryKey: trpc.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
        });
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        );
        onSuccess?.(data.data.id);
        onClose();
        form.reset();
        setCurrentStep(1);
      },
    }),
  );

  const updateExpenseMutation = useMutation(
    trpc.expense.updateExpense.mutationOptions({
      onMutate: async (input) => {
        if (!expense || !expenseQueryKey) return;
        await queryClient.cancelQueries(
          trpc.expense.getExpense.queryOptions({
            expenseId: expense.id,
          }),
        );

        const previousData = queryClient.getQueryData(expenseQueryKey);

        queryClient.setQueryData(expenseQueryKey, (old) => {
          if (!old || old.success === false) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...input,
              expenseSplits: input.splits
                ? input.splits.map((split, index) => {
                    const member = group.groupMembers.find(
                      (m) => m.id === split.groupMemberId,
                    );
                    const splits = {
                      ...split,
                      id: Date.now() + index,
                      createdAt: new Date(),
                      expenseId: expense.id,
                      groupMember: member
                        ? { ...member, groupId: group.id }
                        : {
                            id: split.groupMemberId,
                            groupId: group.id,
                            userId: "",
                            role: "member" as const,
                            joinedOn: new Date(),
                            user: { email: "", name: "Unknown", image: null },
                          },
                    };
                    return splits;
                  })
                : old.data.expenseSplits,
            },
          };
        });

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData && expenseQueryKey) {
          queryClient.setQueryData(expenseQueryKey, context.previousData);
        }
        toast.error("Failed to update expense", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context?.previousData && expenseQueryKey) {
            queryClient.setQueryData(expenseQueryKey, context.previousData);
          }
          toast.error("Failed to update expense", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Expense updated successfully");
        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        if (expense?.id) {
          void queryClient.invalidateQueries(
            trpc.expense.getExpense.queryOptions({ expenseId: expense.id }),
          );
        }
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        );
        if (expense) {
          onSuccess?.(expense.id);
        }
        onClose();
      },
    }),
  );

  const onSubmit = (values: ExpenseValues) => {
    let splits;

    if (values.splitMethod === "equal") {
      const memberIds = values.splits.map((s) => s.groupMemberId);
      splits = distributeEqualAmounts(memberIds, values.amountInCents);
    } else if (values.splitMethod === "percentage") {
      const splitsWithPercentages = values.splits.map((s) => ({
        groupMemberId: s.groupMemberId,
        percentage: s.percentage ?? 0,
      }));
      splits = distributePercentageAmounts(
        splitsWithPercentages,
        values.amountInCents,
      );
    } else {
      splits = values.splits.map((split) => ({
        groupMemberId: split.groupMemberId,
        amountInCents: split.amountInCents,
        percentage: null,
      }));
    }

    if (isEditMode) {
      updateExpenseMutation.mutate({
        expenseId: expense.id,
        paidByGroupMemberId: values.paidByGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: values.description,
        category: values.category,
        expenseDate: values.expenseDate,
        splits,
        splitMethod: values.splitMethod,
      });
    } else {
      createExpenseMutation.mutate({
        groupId: group.id,
        paidByGroupMemberId: values.paidByGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: values.description,
        category: values.category,
        expenseDate: values.expenseDate,
        splits,
        splitMethod: values.splitMethod,
      });
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof ExpenseValues)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        "paidByGroupMemberId",
        "amountInCents",
        "currency",
        "expenseDate",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = ["splits"];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep === 1) {
        const currentSplits = form.getValues("splits");
        const amountCents = form.getValues("amountInCents");

        if (currentSplits.length === 0) {
          const memberIds = group.groupMembers.map((m) => m.id);
          const initialSplits = distributeEqualAmounts(memberIds, amountCents);
          form.setValue("splits", initialSplits);
        } else if (splitMethod === "equal") {
          const memberIds = currentSplits.map((s) => s.groupMemberId);
          const updatedSplits = distributeEqualAmounts(memberIds, amountCents);
          form.setValue("splits", updatedSplits);
        } else if (splitMethod === "percentage") {
          const hasPercentages = currentSplits.some(
            (s) => s.percentage && s.percentage > 0,
          );

          if (hasPercentages) {
            const splitsWithPercentages = currentSplits.map((s) => ({
              groupMemberId: s.groupMemberId,
              percentage: s.percentage ?? 0,
            }));
            const updatedSplits = distributePercentageAmounts(
              splitsWithPercentages,
              amountCents,
            );
            form.setValue("splits", updatedSplits);
          } else {
            const memberIds = currentSplits.map((s) => s.groupMemberId);
            const percentages = calculateEvenPercentageBasisPoints(
              memberIds.length,
            );
            const splitsWithPercentages = memberIds.map(
              (groupMemberId, index) => ({
                groupMemberId,
                percentage: percentages[index] ?? 0,
              }),
            );
            const updatedSplits = distributePercentageAmounts(
              splitsWithPercentages,
              amountCents,
            );
            form.setValue("splits", updatedSplits);
          }
        }
      }
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const isPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  return {
    form,
    currentStep,
    totalSteps,
    isEditMode,
    splitMethod,
    amountInCents,
    currency,
    paidByGroupMemberId,
    description,
    splits,
    isPending,
    createExpenseMutation,
    updateExpenseMutation,
    onSubmit,
    handleNext,
    handleBack,
    group,
  };
}

export type UseExpenseFormReturn = ReturnType<typeof useExpenseForm>;
