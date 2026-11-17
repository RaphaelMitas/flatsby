import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { Stack, usePreventRemove, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import {
  AI_AUTO_DETECT,
  getSubcategoryGroup,
} from "@flatsby/validators/expenses/categories";
import { isExchangeRateFinal } from "@flatsby/validators/expenses/conversion";
import { emptySplit } from "@flatsby/validators/expenses/distribution";
import {
  formatCurrencyFromCents,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";
import {
  editableSplitMethod,
  expenseFormSchema,
  splitState,
} from "@flatsby/validators/expenses/split-editing";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";
import { useExpenseConversion } from "@flatsby/validators/expenses/useExpenseConversion";
import { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { DatePickerField } from "~/lib/ui/date-picker-field";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
  useForm as useFormHook,
} from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { Separator } from "~/lib/ui/separator";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useCloseScreen } from "~/utils/useCloseScreen";
import { useReviewNudge } from "~/utils/useReviewNudge";
import { ConversionField } from "./ConversionField";
import { CurrencyInput } from "./CurrencyInput";
import { CurrencyPicker } from "./CurrencyPicker";
import { getExpenseCategoryData } from "./ExpenseCategoryConfig";
import { ExpenseCategoryPicker } from "./ExpenseCategoryPicker";
import { ExpenseFormRow } from "./ExpenseFormRow";
import { MemberAvatar } from "./MemberAvatar";
import { ReceiptScanCard } from "./ReceiptScan";
import { SplitEditor } from "./SplitEditor";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

function useExchangeRate(
  input: { from: CurrencyCode; to: CurrencyCode; day: string },
  enabled: boolean,
) {
  return useQuery(
    trpc.expense.getExchangeRate.queryOptions(input, {
      enabled,
      staleTime: (query) =>
        isExchangeRateFinal(input.day, query.state.dataUpdatedAt)
          ? Infinity
          : 0,
    }),
  );
}

interface ExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  autoFocus?: boolean;
}

export function ExpenseForm({
  group,
  expense,
  autoFocus = false,
}: ExpenseFormProps) {
  const router = useRouter();
  const close = useCloseScreen();
  const t = useTranslations();
  const locale = useLocale();
  const trpcClient = trpc;
  const queryClient = useQueryClient();
  const recordHappyAction = useReviewNudge();
  const [view, setView] = useState<"details" | "split">("details");
  usePreventRemove(view === "split", () => setView("details"));

  const isEditMode = !!expense;

  const { cancelLists, patchLists, invalidateAll } = useInvalidateExpenses(
    group.id,
  );

  const expenseQueryKey = expense
    ? trpcClient.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  const form = useFormHook<ExpenseValues, ExpenseValues>({
    schema: expenseFormSchema,
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
      splitMethod: editableSplitMethod(expense?.splitMethod),
      splits:
        expense?.expenseSplits.map((split) => ({
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
          shares: split.shares,
        })) ?? group.groupMembers.map((member) => emptySplit(member.id)),
    },
  });
  const splitMethod = editableSplitMethod(
    useWatch({ control: form.control, name: "splitMethod" }),
  );
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
  const reportScanFailureMutation = useMutation(
    trpcClient.receipt.reportFailure.mutationOptions(),
  );
  const scanReceiptMutation = useMutation(
    trpcClient.receipt.scan.mutationOptions(),
  );
  const reducedMotion = useReducedMotion();
  const receiptScan = useReceiptScan({
    read: (file) => scanReceiptMutation.mutateAsync(file),
    reportFailure: (failure) => reportScanFailureMutation.mutate(failure),
    setValue: form.setValue,
    currency,
    locale,
    reducedMotion,
    messages: {
      error: t("errors.unexpected"),
      unsupportedImage: t("expenses.receiptScan.unsupportedFormat"),
      tooLarge: t("expenses.receiptScan.fileTooLarge"),
    },
  });

  const allMembers = useMemo(() => {
    if (!expense) return group.groupMembers;
    const activeIds = new Set(group.groupMembers.map((m) => m.id));
    const inactiveMembers = expense.expenseSplits
      .filter((s) => !activeIds.has(s.groupMemberId))
      .map((s) => ({
        ...s.groupMember,
        isActive: false,
        placeholderName: null,
      }));
    return [...group.groupMembers, ...inactiveMembers];
  }, [expense, group.groupMembers]);

  const createExpenseMutation = useMutation(
    trpcClient.expense.createExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          await cancelLists();

          const paidByMember = group.groupMembers.find(
            (m) => m.id === input.paidByGroupMemberId,
          );
          const currentMember = group.thisGroupMember;

          const pendingId = Date.now();
          const listSnapshot = patchLists((old) => {
            const optimisticExpense = {
              id: pendingId,
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

          return listSnapshot;
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          Alert.alert(
            t("expenses.createFailed"),
            message ?? t("errors.unexpected"),
          ),
        onSuccess: () => {
          invalidateAll();
          void recordHappyAction("expense_created");
        },
      }),
    ),
  );

  const updateExpenseMutation = useMutation(
    trpcClient.expense.updateExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          if (!expense || !expenseQueryKey) return;
          await queryClient.cancelQueries(
            trpcClient.expense.getExpense.queryOptions({
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
          Alert.alert(t("common.error"), message ?? t("expenses.updateFailed")),
        onSuccess: () => {
          invalidateAll(expense?.id);
          close();
        },
      }),
    ),
  );

  const onSubmit = (values: ExpenseValues) => {
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
        splits: values.splits,
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
        splits: values.splits,
        splitMethod: values.splitMethod,
        receipt: receiptScan.report(values),
      });
      router.back();
    }
  };

  const storedSplits = useWatch({ control: form.control, name: "splits" });
  const split = splitState({
    method: splitMethod,
    splits: storedSplits,
    totalAmountCents: amountInCents,
    currency,
    locale,
  });
  const isPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  const paidByItems: BottomSheetPickerItem[] = group.groupMembers.map(
    (member) => ({
      id: member.id.toString(),
      title: member.user.name,
      icon: <MemberAvatar person={memberPerson(member)} className="h-6 w-6" />,
    }),
  );

  return (
    <SafeAreaView edges={[]}>
      <Stack.Screen
        options={{
          headerTitle:
            view === "split"
              ? t("expenses.splitTitle")
              : isEditMode
                ? t("expenses.editExpense")
                : t("expenses.addExpense"),
        }}
      />
      <BottomSheetPickerProvider>
        <Form {...form}>
          {view === "split" ? (
            <SplitEditor
              form={form}
              groupMembers={allMembers}
              totalAmountCents={amountInCents}
              currency={currency}
              conversion={conversion.fields}
              onDone={() => setView("details")}
            />
          ) : (
            <>
              <AppScrollView
                className="flex-1"
                contentContainerClassName="gap-4 p-4"
                bottomOffset={96}
              >
                {!isEditMode && <ReceiptScanCard receiptScan={receiptScan} />}

                <View className="items-center gap-2">
                  <FormField
                    control={form.control}
                    name="amountInCents"
                    render={({ field }) => (
                      <>
                        <CurrencyInput
                          testID="expense-form-amount"
                          autoFocus={autoFocus}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0.00"
                          min={1}
                          className={cn(
                            "h-16 border-0 text-center text-4xl font-bold",
                            receiptScan.justApplied && "bg-muted",
                          )}
                          accessibilityLabel={t("expenses.amount")}
                        />
                        <FormMessage />
                      </>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <CurrencyPicker
                        testID="expense-form-currency"
                        value={field.value}
                        onChange={field.onChange}
                        trigger={
                          <View className="border-border flex-row items-center gap-1.5 rounded-full border px-3 py-1.5">
                            <Text className="text-foreground text-sm font-medium">
                              {field.value}
                            </Text>
                            <Icon
                              name="chevrons-up-down"
                              size={14}
                              color="muted-foreground"
                            />
                          </View>
                        }
                      />
                    )}
                  />
                </View>

                <ConversionField currency={currency} conversion={conversion} />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        testID="expense-form-description"
                        placeholder={t("expenses.descriptionPlaceholder")}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        maxLength={512}
                        className={
                          receiptScan.justApplied ? "border-primary" : undefined
                        }
                        accessibilityLabel={t("expenses.description")}
                      />
                    </FormControl>
                  )}
                />

                <Card>
                  <FormField
                    control={form.control}
                    name="paidByGroupMemberId"
                    render={({ field }) => (
                      <BottomSheetPickerTrigger
                        testID="expense-form-paid-by"
                        items={paidByItems}
                        selectedId={field.value.toString()}
                        onSelect={(item) =>
                          field.onChange(parseInt(item.id, 10))
                        }
                        trigger={
                          <ExpenseFormRow
                            icon="user"
                            title={t("expenses.paidByField")}
                            value={
                              allMembers.find((m) => m.id === field.value)?.user
                                .name ?? t("expenses.selectPayer")
                            }
                            trailing="chevrons-up-down"
                          />
                        }
                      />
                    )}
                  />
                  <Separator />
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => {
                      const category = getExpenseCategoryData({
                        subcategoryId: field.value ?? AI_AUTO_DETECT,
                      });
                      return (
                        <ExpenseCategoryPicker
                          testID="expense-form-category"
                          value={field.value}
                          autoDetect={!isEditMode}
                          onChange={field.onChange}
                          trigger={
                            <ExpenseFormRow
                              icon="tag"
                              title={t("common.category")}
                              value={t(category.name)}
                              trailing="chevrons-up-down"
                            >
                              {category.icon}
                            </ExpenseFormRow>
                          }
                        />
                      );
                    }}
                  />
                  <Separator />
                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <ExpenseFormRow icon="calendar" title={t("common.date")}>
                        <DatePickerField
                          value={field.value}
                          onChange={field.onChange}
                          accessibilityLabel={t("common.date")}
                        />
                      </ExpenseFormRow>
                    )}
                  />
                  <Separator />
                  <Pressable
                    testID="expense-form-split"
                    accessibilityRole="button"
                    onPress={() => setView("split")}
                    disabled={amountInCents <= 0}
                    className={cn(
                      "active:bg-muted",
                      amountInCents <= 0 && "opacity-50",
                    )}
                  >
                    <ExpenseFormRow
                      icon="users"
                      title={t("expenses.splitTitle")}
                      value={t("expenses.reviewSplit", {
                        count: split.participants.length,
                        method: splitMethod,
                      })}
                      trailing="chevron-right"
                    />
                    {split.problem ? (
                      <Text
                        testID="expense-form-split-problem"
                        className="text-destructive px-4 pb-3 text-sm"
                      >
                        {t(split.problem.key, split.problem.values)}
                      </Text>
                    ) : (
                      splitMethod !== "equal" &&
                      amountInCents > 0 && (
                        <View className="flex-row flex-wrap gap-x-3 gap-y-1 px-4 pb-3">
                          {split.participants.map((participant) => {
                            const member = allMembers.find(
                              (m) => m.id === participant.groupMemberId,
                            );
                            return (
                              <View
                                key={participant.groupMemberId}
                                className="flex-row items-center gap-1.5"
                              >
                                {member && (
                                  <MemberAvatar
                                    person={memberPerson(member)}
                                    className="h-5 w-5"
                                    textClassName="text-xs"
                                  />
                                )}
                                <Text className="text-muted-foreground text-sm">
                                  {formatCurrencyFromCents({
                                    cents: participant.amountInCents,
                                    currency,
                                    locale,
                                  })}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )
                    )}
                  </Pressable>
                </Card>
              </AppScrollView>
              <AppKeyboardStickyView className="border-border bg-background border-t p-4">
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
                  disabled={
                    isPending ||
                    amountInCents <= 0 ||
                    conversion.isMissingConverted ||
                    !split.validation.isValid
                  }
                  icon={isPending ? "loader" : undefined}
                  onPress={form.handleSubmit(onSubmit)}
                />
              </AppKeyboardStickyView>
            </>
          )}
        </Form>
      </BottomSheetPickerProvider>
    </SafeAreaView>
  );
}
