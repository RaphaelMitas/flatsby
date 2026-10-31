import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { DebtKind } from "@flatsby/validators/expenses/debt";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import type { SettlementFormValues } from "@flatsby/validators/expenses/schemas";
import type {
  CurrencyCode,
  DebtEntry,
} from "@flatsby/validators/expenses/types";
import { Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import {
  failureOf,
  restoreSnapshot,
  resultMutation,
} from "@flatsby/api/resultMutation";
import { applySettlement, pairDebt } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  personLookup,
  settleOutstandingLabel,
} from "@flatsby/validators/expenses/formatting";
import { settlementFormSchema } from "@flatsby/validators/expenses/schemas";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Form, FormControl, FormField, FormMessage } from "~/lib/ui/form";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";
import { CurrencyInput } from "./CurrencyInput";
import { CurrencyPicker } from "./CurrencyPicker";
import { MemberAvatar } from "./MemberAvatar";
import { SettlementPayment } from "./SettlementPayment";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface SettlementFormProps {
  groupId: number;
  fromGroupMemberId?: number;
  toGroupMemberId?: number;
  currency?: string;
  amount?: number;
  expense?: ExpenseWithSplitsAndMembers;
  source?: DebtKind;
  onClose: () => void;
}

export function SettlementForm({
  groupId,
  fromGroupMemberId,
  toGroupMemberId,
  currency,
  amount,
  expense,
  source,
  onClose,
}: SettlementFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const isEditMode = !!expense;

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  const getDefaultCurrency = (): CurrencyCode => {
    if (currency && isCurrencyCode(currency)) {
      return currency;
    }
    if (expense?.currency && isCurrencyCode(expense.currency)) {
      return expense.currency;
    }
    return groupData.success ? groupData.data.currency : "EUR";
  };

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      amountInCents: expense?.amountInCents ?? amount ?? 0,
      fromGroupMemberId:
        fromGroupMemberId ?? expense?.paidByGroupMemberId ?? -1,

      toGroupMemberId:
        toGroupMemberId ?? expense?.expenseSplits[0]?.groupMemberId ?? -1,

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

  const watchedCurrency = useWatch({ control: form.control, name: "currency" });

  const watchedAmount = useWatch({
    control: form.control,
    name: "amountInCents",
  });

  const isPrefilled = source !== undefined;
  const debtBetween = (from: number, to: number, currency?: string) =>
    debtData.success ? pairDebt(debtData.data, from, to, currency) : undefined;

  const outstanding: DebtEntry | undefined =
    isPrefilled && amount !== undefined
      ? {
          fromGroupMemberId: watchedFromMemberId,
          toGroupMemberId: watchedToMemberId,
          currency: watchedCurrency,
          amountInCents: amount,
        }
      : debtBetween(watchedFromMemberId, watchedToMemberId, watchedCurrency);

  const defaultCurrencyToPairDebt = () => {
    if (isEditMode) return;
    const { fromGroupMemberId: a, toGroupMemberId: b } = form.getValues();
    const pairCurrency = debtBetween(a, b)?.currency;
    if (pairCurrency && isCurrencyCode(pairCurrency)) {
      form.setValue("currency", pairCurrency);
    }
  };

  const {
    cancelLists,
    patchLists,
    debtSummaryQueryKey,
    invalidateList,
    invalidateDebtSummary,
  } = useInvalidateExpenses(groupId);

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
    trpc.expense.createExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          await Promise.all([
            cancelLists(),
            queryClient.cancelQueries({ queryKey: debtSummaryQueryKey }),
          ]);

          const previousDebtSummary =
            queryClient.getQueryData(debtSummaryQueryKey);

          const receiverId = input.splits[0]?.groupMemberId;
          if (receiverId !== undefined) {
            queryClient.setQueryData(debtSummaryQueryKey, (old) => {
              if (!old || old.success === false) return old;
              return {
                success: true as const,
                data: applySettlement(old.data, {
                  fromGroupMemberId: input.paidByGroupMemberId,
                  toGroupMemberId: receiverId,
                  currency: input.currency,
                  amountInCents: input.amountInCents,
                }),
              };
            });
          }

          // Get the paidBy and toMember for the optimistic settlement
          const paidByMember = membersForOptimistic.find(
            (m) => m.id === input.paidByGroupMemberId,
          );
          const splitMember = membersForOptimistic.find(
            (m) => m.id === input.splits[0]?.groupMemberId,
          );

          // Optimistically add the new settlement
          const pendingId = Date.now();
          const listSnapshot = patchLists((old) => {
            const optimisticSettlement: ExpenseWithSplitsAndMembers & {
              isPending: true;
            } = {
              id: pendingId,
              groupId,
              paidByGroupMemberId: input.paidByGroupMemberId,
              amountInCents: input.amountInCents,
              currency: input.currency,
              convertedAmountInCents: null,
              convertedCurrency: null,
              description: input.description,
              category: "other",
              subcategory: "other",
              expenseDate: input.expenseDate,
              createdByGroupMemberId: currentMember?.id ?? 0,
              splitMethod: "settlement",
              createdAt: new Date(),
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
                    user: { email: "", name: t("common.unknown"), image: null },
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
                    user: { email: "", name: t("common.unknown"), image: null },
                  },
              expenseSplits: input.splits.map((split, index) => ({
                id: Date.now() + index,
                createdAt: new Date(),
                expenseId: Date.now(),
                groupMemberId: split.groupMemberId,
                amountInCents: split.amountInCents,
                percentage: split.percentage,
                shares: null,
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
                      user: {
                        email: "",
                        name: t("common.unknown"),
                        image: null,
                      },
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

          return [
            ...listSnapshot,
            { queryKey: debtSummaryQueryKey, previous: previousDebtSummary },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          onClose();
          form.reset();
        },
        onSettled: () => {
          void invalidateList();
          void invalidateDebtSummary();
        },
      }),
    ),
  );

  const updateSettlementMutation = useMutation(
    trpc.expense.updateExpense.mutationOptions(
      resultMutation({
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

            return {
              success: true as const,
              data: {
                ...old.data,
                ...input,
                category: old.data.category,
                subcategory: old.data.subcategory,
              },
            };
          });

          return [{ queryKey: expenseQueryKey, previous: previousData }];
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: expenseQueryKey,
          });
          void invalidateDebtSummary();
          onClose();
        },
      }),
    ),
  );

  const onSubmit = (values: SettlementFormValues) => {
    if (isEditMode) {
      updateSettlementMutation.mutate({
        expenseId: expense.id,
        paidByGroupMemberId: values.fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
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
        // i18n-ignore: stored on the expense and shown to every member
        description: "Settlement",
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
  const meId = groupData.data.thisGroupMember.id;
  const person = personLookup(groupMembers, meId, t);
  const isMember = (id: number) => groupMembers.some((m) => m.id === id);
  const pair =
    isMember(watchedFromMemberId) && isMember(watchedToMemberId)
      ? {
          payer: person(watchedFromMemberId),
          receiver: person(watchedToMemberId),
        }
      : undefined;

  const memberItems: BottomSheetPickerItem[] = groupMembers.map((member) => ({
    id: member.id.toString(),
    title: person(member.id).name,
    icon: <MemberAvatar person={person(member.id)} className="h-6 w-6" />,
  }));
  const memberTitle = (id: number, placeholder: string) =>
    isMember(id) ? person(id).name : placeholder;

  const isPending =
    createSettlementMutation.isPending || updateSettlementMutation.isPending;

  const receiverPaypal =
    groupMembers.find((member) => member.id === watchedToMemberId)?.user
      .paypalHandle ?? null;
  const payerIsMe = watchedFromMemberId === meId;
  const payingWithPaypal = payerIsMe && watchedAmount > 0 && !!receiverPaypal;

  const errorMessage =
    failureOf(createSettlementMutation, t("expenses.genericError")) ??
    failureOf(updateSettlementMutation, t("expenses.genericError"));

  return (
    <BottomSheetPickerProvider>
      <AppScrollView className="flex-1" contentContainerClassName="p-4">
        <Form {...form}>
          <View className="gap-6">
            <View className="gap-4">
              {pair && (
                <View className="flex-row items-center justify-center gap-4 pb-2">
                  <PairMember person={pair.payer} />
                  <View className="items-center">
                    <Icon
                      name="arrow-right"
                      size={26}
                      color="muted-foreground"
                    />
                    <Text className="text-muted-foreground text-xs">
                      {t("debts.pays")}
                    </Text>
                  </View>
                  <PairMember person={pair.receiver} />
                </View>
              )}
              {!isPrefilled && (
                <>
                  <FormField
                    control={form.control}
                    name="fromGroupMemberId"
                    render={({ field }) => (
                      <View className="gap-2">
                        <Label>{t("debts.paying")}</Label>
                        <BottomSheetPickerTrigger
                          items={memberItems}
                          selectedId={
                            field.value ? field.value.toString() : undefined
                          }
                          onSelect={(item) => {
                            const payer = parseInt(item.id, 10);
                            field.onChange(payer);
                            if (payer === watchedToMemberId) {
                              form.setValue("toGroupMemberId", -1);
                            }
                            defaultCurrencyToPairDebt();
                          }}
                          triggerTitle={memberTitle(
                            field.value,
                            t("debts.selectPayer"),
                          )}
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
                        <Label>{t("debts.receiving")}</Label>
                        <BottomSheetPickerTrigger
                          items={memberItems.filter(
                            (item) => item.id !== String(watchedFromMemberId),
                          )}
                          selectedId={
                            field.value ? field.value.toString() : undefined
                          }
                          onSelect={(item) => {
                            field.onChange(parseInt(item.id, 10));
                            defaultCurrencyToPairDebt();
                          }}
                          triggerTitle={memberTitle(
                            field.value,
                            t("debts.selectRecipient"),
                          )}
                        />
                        <FormMessage />
                      </View>
                    )}
                  />
                </>
              )}

              {outstanding && (
                <View
                  testID="settlement-outstanding"
                  className="bg-muted rounded-lg p-4"
                >
                  <Text className="text-muted-foreground mb-1 text-center text-sm">
                    {settleOutstandingLabel(
                      source ?? "direct",
                      outstanding,
                      meId,
                      person,
                      t,
                    )}
                  </Text>
                  <Text className="text-foreground text-center text-2xl font-bold">
                    {formatCurrencyFromCents({
                      cents: outstanding.amountInCents,
                      currency: outstanding.currency,
                      locale,
                    })}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row gap-4">
              {/* Currency Selection */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <View className="gap-2">
                    <Label>{t("debts.currency")}</Label>
                    {isPrefilled ? (
                      <View
                        testID="settlement-currency-locked"
                        className="bg-muted h-12 justify-center rounded-lg px-4"
                      >
                        <Text className="text-foreground">{field.value}</Text>
                      </View>
                    ) : (
                      <CurrencyPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
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
                    <Label>{t("debts.settlementAmount")}</Label>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0.00"
                        min={1}
                        max={isPrefilled ? amount : undefined}
                        className="flex-1"
                      />
                    </FormControl>
                    <FormMessage />
                  </View>
                )}
              />
            </View>
            {!isEditMode && pair && (
              <SettlementPayment
                groupId={groupId}
                paypalHandle={receiverPaypal}
                payerName={pair.payer.name}
                receiverName={pair.receiver.name}
                receiverIsMe={watchedToMemberId === meId}
                payerIsMe={payerIsMe}
                amountInCents={watchedAmount}
                currency={watchedCurrency}
              />
            )}

            {/* Error Display */}
            {errorMessage !== undefined && (
              <Alert variant="destructive">
                <AlertTitle variant="destructive">
                  {t("common.error")}
                </AlertTitle>
                <AlertDescription variant="destructive">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <View className="border-border flex-row gap-2 border-t pt-4">
              <Button
                testID="settlement-cancel-button"
                title={t("common.cancel")}
                variant="outline"
                onPress={onClose}
                disabled={isPending}
                className="flex-1"
              />
              <Button
                testID="settlement-submit-button"
                title={
                  isPending
                    ? isEditMode
                      ? t("common.updating")
                      : t("debts.recording")
                    : isEditMode
                      ? t("debts.updateSettlement")
                      : payingWithPaypal
                        ? t("debts.pay.paidRecord")
                        : t("debts.recordSettlement")
                }
                onPress={form.handleSubmit(onSubmit)}
                disabled={isPending}
                className="flex-1"
                icon={isPending ? "loader" : undefined}
              />
            </View>
          </View>
        </Form>
      </AppScrollView>
    </BottomSheetPickerProvider>
  );
}

function PairMember({ person }: { person: DebtPerson }) {
  return (
    <View className="items-center gap-1.5">
      <MemberAvatar
        person={person}
        className="h-14 w-14"
        textClassName="text-lg"
      />
      <Text className="text-foreground text-sm font-medium">{person.name}</Text>
    </View>
  );
}
