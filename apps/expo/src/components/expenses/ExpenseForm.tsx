import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import { getSubcategoryGroup } from "@flatsby/validators/expenses/categories";
import { emptySplit } from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { expenseSchemaWithValidateSplits } from "@flatsby/validators/expenses/schemas";
import {
  editableSplitMethod,
  finalizeSplits,
  splitsForTotal,
} from "@flatsby/validators/expenses/split-editing";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";
import { useExpenseConversion } from "@flatsby/validators/expenses/useExpenseConversion";

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
import { DatePickerField } from "~/lib/ui/date-picker-field";
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
import { ConversionField } from "./ConversionField";
import { CurrencyInput } from "./CurrencyInput";
import { currencyItems } from "./currencyItems";
import { ExpenseCategoryPicker } from "./ExpenseCategoryPicker";
import { SplitEditor } from "./SplitEditor";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

function useExchangeRate(
  input: { from: CurrencyCode; to: CurrencyCode; day: string },
  enabled: boolean,
) {
  return useQuery(
    trpc.expense.getExchangeRate.queryOptions(input, {
      enabled,
      staleTime: Infinity,
    }),
  );
}

interface ExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  /** Callback when closing the form (for splitview mode). If not provided, uses router.back() */
  onClose?: () => void;
  /** Callback when form is successfully submitted. If not provided, uses router.back() */
  onSuccess?: (expenseId: number) => void;
  autoFocus?: boolean;
}

export function ExpenseForm({
  group,
  expense,
  onClose,
  onSuccess,
  autoFocus = false,
}: ExpenseFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const trpcClient = trpc;
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const isEditMode = !!expense;
  const totalSteps = 3;

  const { expenseListQueryKey, invalidateAll } = useInvalidateExpenses(
    group.id,
  );

  const expenseQueryKey = expense
    ? trpcClient.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  const initialSplitMethod = editableSplitMethod(expense?.splitMethod);

  const form = useFormHook<ExpenseValues, ExpenseValues>({
    schema: expenseSchemaWithValidateSplits,
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
        user: s.groupMember.user,
      }));
    return [...group.groupMembers, ...inactiveMembers];
  }, [expense, group.groupMembers]);

  const createExpenseMutation = useMutation(
    trpcClient.expense.createExpense.mutationOptions({
      onMutate: async (input) => {
        // Cancel any outgoing queries
        await queryClient.cancelQueries({ queryKey: expenseListQueryKey });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(expenseListQueryKey);

        // Get the paidBy and createdBy members for the optimistic expense
        const paidByMember = group.groupMembers.find(
          (m) => m.id === input.paidByGroupMemberId,
        );
        const currentMember = group.thisGroupMember;

        // Optimistically add the new expense
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

        return { previousData };
      },
      onError: (_error, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(expenseListQueryKey, context.previousData);
        }
        Alert.alert(t("common.error"), t("expenses.createFailed"));
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context.previousData) {
            queryClient.setQueryData(expenseListQueryKey, context.previousData);
          }
          Alert.alert(t("common.error"), data.error.message);
          return;
        }

        invalidateAll();
        form.reset();
        setCurrentStep(1);
        if (onSuccess) {
          onSuccess(data.data.id);
        } else if (onClose) {
          onClose();
        } else {
          router.back();
        }
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

        return { previousData };
      },
      onError: (_error, _variables, context) => {
        if (context?.previousData && expenseQueryKey) {
          queryClient.setQueryData(expenseQueryKey, context.previousData);
        }
        Alert.alert(t("common.error"), t("expenses.updateFailed"));
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context?.previousData && expenseQueryKey) {
            queryClient.setQueryData(expenseQueryKey, context.previousData);
          }
          Alert.alert(t("common.error"), data.error.message);
          return;
        }

        invalidateAll(expense?.id);
        if (onSuccess && expense?.id) {
          onSuccess(expense.id);
        } else if (onClose) {
          onClose();
        } else {
          router.back();
        }
      },
    }),
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
        ...conversion.fields,
        description: values.description,
        subcategory: values.subcategory,
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
        ...conversion.fields,
        description: values.description,
        subcategory: values.subcategory,
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

  const paidByGroupMemberId = useWatch({
    control: form.control,
    name: "paidByGroupMemberId",
  });
  const description = useWatch({ control: form.control, name: "description" });
  const splits = useWatch({ control: form.control, name: "splits" });
  const participantCount = finalizeSplits(
    splitMethod,
    splits,
    amountInCents,
  ).length;
  const isPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

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
    <SafeAreaView edges={[]}>
      <BottomSheetPickerProvider>
        <View className="border-border flex-row items-center justify-between border-b px-4 py-3">
          <Text
            testID="expense-form-step"
            className="text-muted-foreground text-sm"
          >
            {t("expenses.stepOf", { step: currentStep, total: totalSteps })}
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
                    <CardTitle>{t("expenses.amountAndDetails")}</CardTitle>
                  </CardHeader>
                  <CardContent className="gap-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>{t("expenses.description")}</Label>
                          <FormControl>
                            <Input
                              testID="expense-form-description"
                              autoFocus={autoFocus}
                              placeholder={t("expenses.descriptionPlaceholder")}
                              value={field.value}
                              onChangeText={field.onChange}
                              onBlur={field.onBlur}
                              maxLength={512}
                            />
                          </FormControl>
                          <FormMessage />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amountInCents"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>{t("expenses.amount")}</Label>
                          <View className="flex-row items-center gap-2">
                            <FormField
                              control={form.control}
                              name="currency"
                              render={({ field: currencyField }) => (
                                <BottomSheetPickerTrigger
                                  testID="expense-form-currency"
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
                              testID="expense-form-amount"
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

                    <ConversionField
                      currency={currency}
                      conversion={conversion}
                    />

                    <FormField
                      control={form.control}
                      name="paidByGroupMemberId"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>{t("expenses.paidByField")}</Label>
                          <BottomSheetPickerTrigger
                            items={paidByItems}
                            selectedId={field.value.toString()}
                            onSelect={(item) => {
                              field.onChange(parseInt(item.id, 10));
                            }}
                            triggerTitle={
                              group.groupMembers.find(
                                (m) => m.id === field.value,
                              )?.user.name ?? t("expenses.selectPayer")
                            }
                          />
                          <FormMessage />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <View className="gap-2">
                          <Label>{t("common.category")}</Label>
                          <ExpenseCategoryPicker
                            testID="expense-form-category"
                            value={field.value}
                            autoDetect={!isEditMode}
                            onChange={field.onChange}
                          />
                        </View>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <DatePickerField
                          label={t("common.date")}
                          value={field.value}
                          onChange={field.onChange}
                        />
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
                        groupMembers={allMembers}
                        totalAmountCents={amountInCents}
                        currency={currency}
                        conversion={conversion.fields}
                        splitMethod={editableSplitMethod(splitMethod)}
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
                    <CardTitle>{t("expenses.review")}</CardTitle>
                    <CardDescription>
                      {t("expenses.reviewHint")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="gap-3">
                    {description && (
                      <View className="flex-row justify-between">
                        <Text className="text-muted-foreground">
                          {t("expenses.descriptionLabel")}
                        </Text>
                        <Text className="text-foreground text-right font-semibold">
                          {description}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground">
                        {t("expenses.amountLabel")}
                      </Text>
                      <Text className="text-foreground font-semibold">
                        {formatCurrencyFromCents({
                          cents: amountInCents,
                          currency: currency,
                          locale,
                        })}
                      </Text>
                    </View>
                    {conversion.fields.convertedAmountInCents !== null && (
                      <>
                        <View className="flex-row justify-between">
                          <Text className="text-muted-foreground">
                            {t("expenses.conversion.inCurrencyLabel", {
                              currency: conversion.targetCurrency,
                            })}
                          </Text>
                          <Text className="text-foreground font-semibold">
                            {formatCurrencyFromCents({
                              cents: conversion.fields.convertedAmountInCents,
                              currency: conversion.targetCurrency,
                              locale,
                            })}
                          </Text>
                        </View>
                        <View className="flex-row justify-between gap-4">
                          <Text className="text-muted-foreground">
                            {t("expenses.conversion.rate")}
                          </Text>
                          <Text className="text-foreground flex-1 text-right font-semibold">
                            {conversion.rateText}
                          </Text>
                        </View>
                      </>
                    )}
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground">
                        {t("expenses.paidByFieldLabel")}
                      </Text>
                      <Text className="text-foreground font-semibold">
                        {allMembers.find((m) => m.id === paidByGroupMemberId)
                          ?.user.name ?? t("common.unknown")}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground">
                        {t("expenses.splitLabel")}
                      </Text>
                      <Text className="text-foreground font-semibold">
                        {t("expenses.reviewSplit", {
                          count: participantCount,
                          method: splitMethod,
                        })}
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
                testID="expense-form-back"
                title={t("common.back")}
                variant="outline"
                onPress={handleBack}
                disabled={isPending}
                icon="arrow-left"
                className="flex-1"
              />
            )}
            {currentStep < totalSteps ? (
              <Button
                testID="expense-form-next"
                title={t("common.next")}
                onPress={handleNext}
                disabled={
                  isPending ||
                  amountInCents <= 0 ||
                  conversion.isMissingConverted
                }
                icon="arrow-right"
                className="flex-1"
              />
            ) : (
              <Button
                testID="expense-form-submit"
                title={
                  isPending
                    ? isEditMode
                      ? t("common.updating")
                      : t("common.creating")
                    : isEditMode
                      ? t("expenses.updateExpense")
                      : t("expenses.createExpense")
                }
                disabled={isPending || conversion.isMissingConverted}
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
