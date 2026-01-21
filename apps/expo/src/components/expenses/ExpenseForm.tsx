import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { SplitMethod } from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";

import {
  calculateEvenPercentageBasisPoints,
  distributeEqualAmounts,
  distributePercentageAmounts,
} from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { expenseSchemaWithValidateSplits } from "@flatsby/validators/expenses/schemas";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
  useForm as useFormHook,
} from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { CurrencyInput } from "./CurrencyInput";
import { SplitEditor } from "./SplitEditor";

interface ExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
}

export function ExpenseForm({ group, expense }: ExpenseFormProps) {
  const router = useRouter();
  const trpcClient = trpc;
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const isEditMode = !!expense;
  const totalSteps = 3;

  // Get the query key for expense list
  const expenseListQueryKey =
    trpcClient.expense.getGroupExpenses.infiniteQueryKey({
      groupId: group.id,
      limit: 20,
    });

  const expenseQueryKey = expense
    ? trpcClient.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  // Determine the initial split method from the expense or default to "equal"
  const initialSplitMethod: SplitMethod =
    expense?.splitMethod === "equal" ||
    expense?.splitMethod === "percentage" ||
    expense?.splitMethod === "custom"
      ? expense.splitMethod
      : "equal";

  const form = useFormHook<ExpenseValues, ExpenseValues>({
    schema: expenseSchemaWithValidateSplits,
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

  const createExpenseMutation = useMutation(
    trpcClient.expense.createExpense.mutationOptions({
      onMutate: async (input) => {
        // Cancel any outgoing queries
        await queryClient.cancelQueries(
          trpcClient.expense.getGroupExpenses.queryOptions({
            groupId: group.id,
            limit: 20,
          }),
        );

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(
          trpcClient.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
        );

        // Get the paidBy and createdBy members for the optimistic expense
        const paidByMember = group.groupMembers.find(
          (m) => m.id === input.paidByGroupMemberId,
        );
        const currentMember = group.thisGroupMember;

        // Optimistically add the new expense
        queryClient.setQueryData(
          trpcClient.expense.getGroupExpenses.infiniteQueryKey({
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
      },
      onSuccess: (data) => {
        if (data.success === false) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        void queryClient.invalidateQueries(
          trpcClient.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        );
        router.back();
        form.reset();
        setCurrentStep(1);
      },
    }),
  );

  const updateExpenseMutation = useMutation(
    trpcClient.expense.updateExpense.mutationOptions({
      onMutate: async (input) => {
        if (!expense || !expenseQueryKey) return;
        // Cancel any outgoing queries
        await queryClient.cancelQueries(
          trpcClient.expense.getExpense.queryOptions({
            expenseId: expense.id,
          }),
        );

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(expenseQueryKey);

        // Optimistically update the expense in the list
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
      },
      onSuccess: (data) => {
        if (data.success === false) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        if (expense?.id) {
          void queryClient.invalidateQueries(
            trpcClient.expense.getExpense.queryOptions({
              expenseId: expense.id,
            }),
          );
        }
        void queryClient.invalidateQueries(
          trpcClient.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        );
        router.back();
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
  const isPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  const currencyItems: BottomSheetPickerItem[] = CURRENCY_CODES.map((code) => ({
    id: code,
    title: code,
  }));

  const paidByItems: BottomSheetPickerItem[] = group.groupMembers.map(
    (member) => ({
      id: member.id.toString(),
      title: member.user.name,
      icon: (
        <Avatar className="h-6 w-6">
          <AvatarImage src={member.user.image ?? undefined} />
          <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      ),
    }),
  );

  return (
    <SafeAreaView>
      <BottomSheetPickerProvider>
        <View className="border-border flex-row items-center justify-between border-b px-4 py-3">
          <Text className="text-muted-foreground text-sm">
            Step {currentStep} of {totalSteps}
          </Text>
          <View className="flex-row gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                className={`h-2 w-8 rounded ${
                  i + 1 <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </View>
        </View>

        <Form {...form}>
          <AppScrollView className="flex-1" contentContainerClassName="p-4">
            {currentStep === 1 && (
              <View className="gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Amount & Details</CardTitle>
                  </CardHeader>
                  <CardContent className="gap-4">
                    <FormField
                      control={form.control}
                      name="amountInCents"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>Amount</Label>
                          <View className="flex-row items-center gap-2">
                            <FormField
                              control={form.control}
                              name="currency"
                              render={({ field: currencyField }) => (
                                <BottomSheetPickerTrigger
                                  items={currencyItems}
                                  selectedId={currencyField.value}
                                  onSelect={(item) => {
                                    currencyField.onChange(item.id);
                                  }}
                                  triggerTitle={currencyField.value}
                                />
                              )}
                            />
                            <CurrencyInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="0.00"
                              min={1}
                              className="flex-1"
                            />
                          </View>
                          <FormMessage />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paidByGroupMemberId"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>Paid By</Label>
                          <BottomSheetPickerTrigger
                            items={paidByItems}
                            selectedId={field.value.toString()}
                            onSelect={(item) => {
                              field.onChange(parseInt(item.id));
                            }}
                            triggerTitle={
                              group.groupMembers.find(
                                (m) => m.id === field.value,
                              )?.user.name ?? "Select who paid"
                            }
                          />
                          <FormMessage />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>Description (Optional)</Label>
                          <FormControl>
                            <Input
                              placeholder="What was this expense for?"
                              value={field.value}
                              onChangeText={field.onChange}
                              maxLength={512}
                            />
                          </FormControl>
                          <FormMessage />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>Category (Optional)</Label>
                          <FormControl>
                            <Input
                              placeholder="e.g., Food, Transport, Utilities"
                              value={field.value}
                              onChangeText={field.onChange}
                              maxLength={100}
                            />
                          </FormControl>
                          <FormMessage />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>Date</Label>
                          <FormControl>
                            <Input
                              value={field.value.toISOString().split("T")[0]}
                              onChangeText={(text) => {
                                field.onChange(new Date(text));
                              }}
                              placeholder="YYYY-MM-DD"
                            />
                          </FormControl>
                          <FormMessage />
                        </View>
                      )}
                    />
                  </CardContent>
                </Card>
              </View>
            )}

            {currentStep === 2 && amountInCents > 0 && (
              <View className="gap-4">
                <FormField
                  control={form.control}
                  name="splitMethod"
                  render={({ field }) => (
                    <FormControl>
                      <SplitEditor
                        form={form}
                        groupMembers={group.groupMembers}
                        totalAmountCents={amountInCents}
                        currency={currency}
                        splitMethod={
                          splitMethod !== "settlement" ? splitMethod : "equal"
                        }
                        onSplitMethodChange={(method) => {
                          field.onChange(method);
                        }}
                      />
                    </FormControl>
                  )}
                />
              </View>
            )}

            {currentStep === 3 && (
              <View className="gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Review</CardTitle>
                    <CardDescription>
                      Review your expense before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="gap-3">
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground">Amount:</Text>
                      <Text className="text-foreground font-semibold">
                        {formatCurrencyFromCents({
                          cents: amountInCents,
                          currency: currency,
                        })}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground">Paid By:</Text>
                      <Text className="text-foreground font-semibold">
                        {group.groupMembers.find(
                          (m) => m.id === paidByGroupMemberId,
                        )?.user.name ?? "Unknown"}
                      </Text>
                    </View>
                    {description && (
                      <View className="flex-row justify-between">
                        <Text className="text-muted-foreground">
                          Description:
                        </Text>
                        <Text className="text-foreground text-right font-semibold">
                          {description}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground">Split:</Text>
                      <Text className="text-foreground font-semibold">
                        {splits.length}{" "}
                        {splits.length === 1 ? "person" : "people"} (
                        {splitMethod})
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </View>
            )}
          </AppScrollView>
          <View className="border-border flex-row gap-2 border-t p-4">
            {currentStep > 1 && (
              <Button
                title="Back"
                variant="outline"
                onPress={handleBack}
                disabled={isPending}
                icon="arrow-left"
                className="flex-1"
              />
            )}
            {currentStep < totalSteps ? (
              <Button
                title="Next"
                onPress={handleNext}
                disabled={isPending || amountInCents <= 0}
                icon="arrow-right"
                className="flex-1"
              />
            ) : (
              <Button
                title={
                  isPending
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                      ? "Update Expense"
                      : "Create Expense"
                }
                disabled={isPending}
                icon={isPending ? "loader" : undefined}
                onPress={form.handleSubmit(onSubmit)}
                className="flex-1"
              />
            )}
          </View>
        </Form>
      </BottomSheetPickerProvider>
    </SafeAreaView>
  );
}
