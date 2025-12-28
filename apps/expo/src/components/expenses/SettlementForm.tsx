import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { SettlementFormValues } from "@flatsby/validators/expenses/schemas";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { settlementFormSchema } from "@flatsby/validators/expenses/schemas";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, FormMessage } from "~/lib/ui/form";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";
import { CurrencyInput } from "./CurrencyInput";

interface SettlementFormProps {
  groupId: number;
  fromGroupMemberId?: number;
  toGroupMemberId?: number;
  currency?: string;
  amount: number | undefined;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
}

export function SettlementForm({
  groupId,
  fromGroupMemberId,
  toGroupMemberId,
  currency,
  amount,
  expense,
  onClose,
}: SettlementFormProps) {
  const queryClient = useQueryClient();

  const isEditMode = !!expense;

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  const getDefaultCurrency = (): "EUR" | "USD" | "GBP" => {
    if (currency && isCurrencyCode(currency)) {
      return currency;
    }
    if (expense?.currency && isCurrencyCode(expense.currency)) {
      return expense.currency;
    }
    return "EUR";
  };

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      amountInCents: expense?.amountInCents ?? amount ?? 0,
      fromGroupMemberId:
        fromGroupMemberId ?? expense?.expenseSplits[0]?.groupMemberId ?? -1,

      toGroupMemberId: toGroupMemberId ?? expense?.paidByGroupMemberId ?? -1,

      currency: getDefaultCurrency(),
    },
  });

  const watchedFromMemberId = useWatch({
    control: form.control,
    name: "fromGroupMemberId",
  });

  const watchedToMemberId = useWatch({
    control: form.control,
    name: "toGroupMemberId",
  });

  // Calculate outstanding debt based on selected members
  const getOutstandingDebt = useCallback(
    (
      fromId: number | undefined,
      toId: number | undefined,
    ): { amountInCents: number; currency: CurrencyCode }[] => {
      if (
        !fromId ||
        !toId ||
        fromId === -1 ||
        toId === -1 ||
        !debtData.success
      ) {
        return [];
      }

      const debtSummary = debtData.data;
      const outstandingDebts: {
        amountInCents: number;
        currency: CurrencyCode;
      }[] = [];

      // Look through all currencies to find the debt between these two members
      for (const [currencyKey, currencyDebts] of Object.entries(
        debtSummary.currencies,
      )) {
        const debt = currencyDebts.debts.find(
          (d) => d.fromGroupMemberId === fromId && d.toGroupMemberId === toId,
        );

        if (debt) {
          outstandingDebts.push({
            amountInCents: debt.amountInCents,
            currency: isCurrencyCode(currencyKey) ? currencyKey : "EUR",
          });
        }
      }

      return outstandingDebts;
    },
    [debtData],
  );

  const currentOutstandingDebts = getOutstandingDebt(
    watchedFromMemberId,
    watchedToMemberId,
  );

  const expenseListQueryKey = trpc.expense.getGroupExpenses.infiniteQueryKey({
    groupId,
    limit: 20,
  });

  const expenseQueryKey = expense
    ? trpc.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

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
            splitMethod: "settlement" as const,
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
      onError: (_error, _variables, context) => {
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
      onError: (_error, _variables, context) => {
        if (context?.previousData && expenseQueryKey) {
          queryClient.setQueryData(expenseQueryKey, context.previousData);
        }
      },
      onSuccess: (data) => {
        if (data.success === false) {
          return;
        }

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
        paidByGroupMemberId: values.fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: `Settlement payment`,
        expenseDate: expense.expenseDate,
        splits: [
          {
            groupMemberId: values.toGroupMemberId,
            amountInCents: values.amountInCents,
            percentage: null,
          },
        ],
        splitMethod: "settlement",
      });
    } else {
      createSettlementMutation.mutate({
        groupId,
        paidByGroupMemberId: values.fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: `Settlement payment`,
        expenseDate: new Date(),
        splits: [
          {
            groupMemberId: values.toGroupMemberId,
            amountInCents: values.amountInCents,
            percentage: null,
          },
        ],
        splitMethod: "settlement",
      });
    }
  };

  if (!groupData.success) {
    return null;
  }

  const groupMembers = groupData.data.groupMembers;

  // Create picker items for members
  const memberItems: BottomSheetPickerItem[] = groupMembers.map((member) => ({
    id: member.id.toString(),
    title: member.user.name,
    icon: (
      <Avatar className="h-6 w-6">
        <AvatarImage src={member.user.image ?? undefined} />
        <AvatarFallback>
          {member.user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    ),
  }));

  // Create picker items for currency
  const currencyItems: BottomSheetPickerItem[] = CURRENCY_CODES.map((code) => ({
    id: code,
    title: code,
  }));

  const isPending =
    createSettlementMutation.isPending || updateSettlementMutation.isPending;

  const hasError =
    createSettlementMutation.isError ||
    updateSettlementMutation.isError ||
    createSettlementMutation.data?.success === false ||
    updateSettlementMutation.data?.success === false;

  const errorMessage =
    createSettlementMutation.data?.success === false
      ? createSettlementMutation.data.error.message
      : updateSettlementMutation.data?.success === false
        ? updateSettlementMutation.data.error.message
        : (createSettlementMutation.error?.message ??
          updateSettlementMutation.error?.message ??
          "An error occurred");

  return (
    <BottomSheetPickerProvider>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <Form {...form}>
          <View className="gap-6">
            {/* Settlement Info */}
            <View className="gap-4">
              <FormField
                control={form.control}
                name="fromGroupMemberId"
                render={({ field }) => (
                  <View className="gap-2">
                    <Label>Paying</Label>
                    <BottomSheetPickerTrigger
                      items={memberItems}
                      selectedId={
                        field.value ? field.value.toString() : undefined
                      }
                      onSelect={(item) => {
                        field.onChange(parseInt(item.id));
                      }}
                      triggerTitle={
                        groupMembers.find((m) => m.id === field.value)?.user
                          .name ?? "Select who is paying"
                      }
                    />
                    <FormMessage />
                  </View>
                )}
              />

              <FormField
                control={form.control}
                name="toGroupMemberId"
                render={({ field }) => (
                  <View className="gap-2">
                    <Label>Receiving</Label>
                    <BottomSheetPickerTrigger
                      items={memberItems}
                      selectedId={
                        field.value ? field.value.toString() : undefined
                      }
                      onSelect={(item) => {
                        field.onChange(parseInt(item.id));
                      }}
                      triggerTitle={
                        groupMembers.find((m) => m.id === field.value)?.user
                          .name ?? "Select who is receiving"
                      }
                    />
                    <FormMessage />
                  </View>
                )}
              />

              {currentOutstandingDebts.length > 0 &&
                currentOutstandingDebts.map((debt) => (
                  <View className="bg-muted rounded-lg p-4">
                    <Text className="text-muted-foreground mb-1 text-center text-sm">
                      Outstanding debt
                    </Text>
                    <Text className="text-foreground text-center text-2xl font-bold">
                      {formatCurrencyFromCents({
                        cents: debt.amountInCents,
                        currency: debt.currency,
                      })}
                    </Text>
                  </View>
                ))}
            </View>

            <View className="flex-row gap-4">
              {/* Currency Selection */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <View className="gap-2">
                    <Label>Currency</Label>
                    <BottomSheetPickerTrigger
                      items={currencyItems}
                      selectedId={field.value}
                      onSelect={(item) => {
                        field.onChange(item.id);
                      }}
                      triggerTitle={field.value}
                    />
                    <FormMessage />
                  </View>
                )}
              />

              {/* Amount Input */}
              <FormField
                control={form.control}
                name="amountInCents"
                render={({ field }) => (
                  <View className="flex-1 gap-2">
                    <Label>Settlement Amount</Label>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0.00"
                        min={1}
                        className="flex-1"
                      />
                    </FormControl>
                    <FormMessage />
                  </View>
                )}
              />
            </View>
            {/* Error Display */}
            {hasError && (
              <Alert variant="destructive">
                <AlertTitle variant="destructive">Error</AlertTitle>
                <AlertDescription variant="destructive">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <View className="border-border flex-row gap-2 border-t pt-4">
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                disabled={isPending}
                className="flex-1"
              />
              <Button
                title={
                  isPending
                    ? isEditMode
                      ? "Updating..."
                      : "Recording..."
                    : isEditMode
                      ? "Update Settlement"
                      : "Record Settlement"
                }
                onPress={form.handleSubmit(onSubmit)}
                disabled={isPending}
                className="flex-1"
                icon={isPending ? "loader" : undefined}
              />
            </View>
          </View>
        </Form>
      </ScrollView>
    </BottomSheetPickerProvider>
  );
}
