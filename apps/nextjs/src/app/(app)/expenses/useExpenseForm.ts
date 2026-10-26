"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { toast } from "@flatsby/ui/toast";
import { getSubcategoryGroup } from "@flatsby/validators/expenses/categories";
import { emptySplit } from "@flatsby/validators/expenses/distribution";
import { expenseSchemaWithValidateSplits } from "@flatsby/validators/expenses/schemas";
import {
  editableSplitMethod,
  finalizeSplits,
  splitsForTotal,
} from "@flatsby/validators/expenses/split-editing";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";
import { useExpenseConversion } from "@flatsby/validators/expenses/useExpenseConversion";

import { useTRPC } from "~/trpc/react";
import { useExpenseInvalidation } from "./useExpenseInvalidation";

interface UseExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  onSuccess?: (expenseId: number) => void;
  closeOnSubmit?: boolean;
}

function useExchangeRate(
  input: { from: CurrencyCode; to: CurrencyCode; day: string },
  enabled: boolean,
) {
  const trpc = useTRPC();
  return useQuery(
    trpc.expense.getExchangeRate.queryOptions(input, {
      enabled,
      staleTime: Infinity,
    }),
  );
}

export function useExpenseForm({
  group,
  expense,
  onClose,
  onSuccess,
  closeOnSubmit,
}: UseExpenseFormProps) {
  const trpc = useTRPC();
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const isEditMode = !!expense;
  const totalSteps = 3;

  const { expenseListQueryKey, invalidateAll } = useExpenseInvalidation(
    group.id,
  );

  const expenseQueryKey = expense
    ? trpc.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  const initialSplitMethod = editableSplitMethod(expense?.splitMethod);

  const form = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchemaWithValidateSplits),
    defaultValues: {
      paidByGroupMemberId:
        expense?.paidByGroupMemberId ?? group.thisGroupMember.id,
      amountInCents: expense?.amountInCents ?? 0,
      currency:
        expense && isCurrencyCode(expense.currency)
          ? expense.currency
          : group.currency,
      description: expense?.description ?? "",
      subcategory: expense?.subcategory,
      expenseDate: expense?.expenseDate
        ? new Date(expense.expenseDate)
        : new Date(),
      splitMethod: initialSplitMethod,
      splits:
        expense?.expenseSplits.map((split) => ({
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
          shares: split.shares,
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
  const expenseDate = useWatch({ control: form.control, name: "expenseDate" });
  const conversion = useExpenseConversion({
    group,
    expense,
    currency,
    amountInCents,
    expenseDate,
    useExchangeRate,
    locale,
  });

  const createExpenseMutation = useMutation(
    trpc.expense.createExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          await queryClient.cancelQueries({ queryKey: expenseListQueryKey });

          const previousData = queryClient.getQueryData(expenseListQueryKey);

          const paidByMember = group.groupMembers.find(
            (m) => m.id === input.paidByGroupMemberId,
          );
          const currentMember = group.thisGroupMember;

          queryClient.setQueryData(expenseListQueryKey, (old) => {
            if (!old) return old;

            const optimisticExpense = {
              id: Date.now(),
              groupId: group.id,
              paidByGroupMemberId: input.paidByGroupMemberId,
              amountInCents: input.amountInCents,
              currency: input.currency,
              convertedAmountInCents: input.convertedAmountInCents ?? null,
              convertedCurrency: input.convertedCurrency ?? null,
              description: input.description,
              category: getSubcategoryGroup(input.subcategory),
              subcategory: input.subcategory ?? "other",
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
                    user: { email: "", name: t("common.unknown"), image: null },
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
                  shares: split.shares ?? null,
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
                        user: {
                          email: "",
                          name: t("common.unknown"),
                          image: null,
                        },
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
          });

          return [{ queryKey: expenseListQueryKey, previous: previousData }];
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          toast.error(t("expenses.createFailed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: (created) => {
          toast.success(t("expenses.createSuccess"));
          invalidateAll();
          if (closeOnSubmit) return;
          onSuccess?.(created.id);
          onClose();
          form.reset();
          setCurrentStep(1);
        },
      }),
    ),
  );

  const updateExpenseMutation = useMutation(
    trpc.expense.updateExpense.mutationOptions(
      resultMutation({
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
              success: true as const,
              data: {
                ...old.data,
                ...input,
                category: input.subcategory
                  ? getSubcategoryGroup(input.subcategory)
                  : old.data.category,
                subcategory: input.subcategory ?? old.data.subcategory,
                expenseSplits: input.splits
                  ? input.splits.map((split, index) => {
                      const member = group.groupMembers.find(
                        (m) => m.id === split.groupMemberId,
                      );
                      const existingSplit = expense.expenseSplits.find(
                        (s) => s.groupMemberId === split.groupMemberId,
                      );
                      const splits = {
                        ...split,
                        shares: split.shares ?? null,
                        id: Date.now() + index,
                        createdAt: new Date(),
                        expenseId: expense.id,
                        groupMember: member
                          ? { ...member, groupId: group.id }
                          : existingSplit
                            ? {
                                id: existingSplit.groupMember.id,
                                groupId: group.id,
                                userId: "",
                                role: "member" as const,
                                joinedOn: new Date(),
                                user: existingSplit.groupMember.user,
                              }
                            : {
                                id: split.groupMemberId,
                                groupId: group.id,
                                userId: "",
                                role: "member" as const,
                                joinedOn: new Date(),
                                user: {
                                  email: "",
                                  name: t("common.unknown"),
                                  image: null,
                                },
                              },
                      };
                      return splits;
                    })
                  : old.data.expenseSplits,
              },
            };
          });

          return [{ queryKey: expenseQueryKey, previous: previousData }];
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          toast.error(t("expenses.updateFailed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: () => {
          toast.success(t("expenses.updateSuccess"));
          invalidateAll(expense?.id);
          if (expense) {
            onSuccess?.(expense.id);
          }
          onClose();
        },
      }),
    ),
  );

  const onSubmit = (values: ExpenseValues) => {
    const splits = finalizeSplits(
      values.splitMethod,
      values.splits,
      values.amountInCents,
    );

    if (isEditMode) {
      updateExpenseMutation.mutate({
        expenseId: expense.id,
        paidByGroupMemberId: values.paidByGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: values.description,
        subcategory: values.subcategory,
        expenseDate: values.expenseDate,
        splits,
        splitMethod: values.splitMethod,
        ...conversion.fields,
      });
    } else {
      createExpenseMutation.mutate({
        groupId: group.id,
        paidByGroupMemberId: values.paidByGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: values.description,
        subcategory: values.subcategory,
        expenseDate: values.expenseDate,
        splits,
        splitMethod: values.splitMethod,
        ...conversion.fields,
      });
      if (closeOnSubmit) onClose();
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof ExpenseValues)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        "paidByGroupMemberId",
        "amountInCents",
        "currency",
        "description",
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

        if (splitMethod !== "settlement") {
          form.setValue(
            "splits",
            splitsForTotal(
              splitMethod,
              currentSplits.length > 0
                ? currentSplits
                : group.groupMembers.map((m) => emptySplit(m.id)),
              amountCents,
            ),
          );
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

  const allMembers = useMemo(() => {
    if (!expense) return group.groupMembers;
    const activeIds = new Set(group.groupMembers.map((m) => m.id));
    const inactiveMembers = expense.expenseSplits
      .filter((s) => !activeIds.has(s.groupMemberId))
      .map((s) => ({
        id: s.groupMember.id,
        userId: "",
        role: "member" as const,
        joinedOn: new Date(),
        isActive: false,
        user: s.groupMember.user,
      }));
    return [...group.groupMembers, ...inactiveMembers];
  }, [expense, group.groupMembers]);

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
    allMembers,
    conversion,
  };
}

export type UseExpenseFormReturn = ReturnType<typeof useExpenseForm>;
