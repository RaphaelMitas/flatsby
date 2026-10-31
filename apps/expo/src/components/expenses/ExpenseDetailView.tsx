import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { inLedgerCurrency } from "@flatsby/validators/expenses/conversion";
import {
  formatCurrencyFromCents,
  formatExpenseAmounts,
  formatExpenseDateLong,
  formatSplitPortion,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Badge } from "~/lib/ui/badge";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { ExpenseCategoryBadge } from "~/lib/ui/expense-category-badge";
import { Separator } from "~/lib/ui/separator";
import { trpc } from "~/utils/api";
import { useCloseScreen } from "~/utils/useCloseScreen";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { MemberAvatar } from "./MemberAvatar";
import { RateInfoButton } from "./RateInfoButton";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface ExpenseDetailViewProps {
  expenseId: number;
  groupId: number;
}

export function ExpenseDetailView({
  expenseId,
  groupId,
}: ExpenseDetailViewProps) {
  const router = useRouter();
  const close = useCloseScreen();
  const t = useTranslations();
  const locale = useLocale();
  const trpcClient = trpc;
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: groupData } = useSuspenseQuery(
    trpcClient.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data: expenseData } = useSuspenseQuery(
    trpcClient.expense.getExpense.queryOptions({ expenseId }),
  );

  const { expenseListQueryKey, patchLists, invalidateAll } =
    useInvalidateExpenses(groupId);

  const deleteExpenseMutation = useMutation(
    trpcClient.expense.deleteExpense.mutationOptions(
      resultMutation({
        onMutate: async (input) => {
          // Cancel any outgoing queries
          await queryClient.cancelQueries({ queryKey: expenseListQueryKey });

          // Optimistically remove the expense from the list
          const listSnapshot = patchLists((old) => {
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

          return listSnapshot;
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          Alert.alert(
            t("expenses.deleteFailed"),
            message ?? t("errors.unexpected"),
          ),
        onSuccess: () => {
          invalidateAll();
          close();
        },
      }),
    ),
  );

  const handleDelete = () => {
    deleteExpenseMutation.mutate({ expenseId });
    setShowDeleteDialog(false);
  };

  if (!expenseData.success || !groupData.success) return null;

  const expense = expenseData.data;

  const amounts = formatExpenseAmounts(expense, locale);
  const ledger = inLedgerCurrency(expense);
  const expenseDate = new Date(expense.expenseDate);
  const formattedDate = formatExpenseDateLong(expenseDate, locale);

  return (
    <>
      <View className="h-full gap-4 p-4">
        <View className="flex-row gap-2">
          <Button
            testID="expense-edit-button"
            title={t("common.edit")}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/expenses/[expenseId]/edit",
                params: { expenseId: expenseId.toString() },
              })
            }
            className="flex-1"
            disabled={deleteExpenseMutation.isPending}
            icon="pencil"
          />
          <Button
            testID="expense-delete-button"
            title={t("common.delete")}
            variant="destructive"
            onPress={() => setShowDeleteDialog(true)}
            disabled={deleteExpenseMutation.isPending}
            icon="trash-2"
            className="flex-1"
          />
        </View>

        <AppScrollView className="flex-1" contentContainerClassName=" gap-4">
          {/* Expense Details Card */}
          <Card>
            <CardHeader>
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <CardTitle className="text-2xl">{amounts.amount}</CardTitle>
                  {amounts.rate && (
                    <View className="mt-1 gap-1">
                      <Text className="text-muted-foreground text-sm">
                        {amounts.paid} · {amounts.rate}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-muted-foreground text-xs">
                          {t("expenses.conversion.convertedWhenAdded")}
                        </Text>
                        <RateInfoButton targetCurrency={ledger.currency} />
                      </View>
                    </View>
                  )}
                  {expense.description && (
                    <CardDescription className="mt-2 text-base">
                      {expense.description}
                    </CardDescription>
                  )}
                </View>
                {expense.splitMethod === "settlement" && (
                  <Badge variant="secondary">
                    <Icon
                      name="handshake"
                      size={12}
                      color="secondary-foreground"
                    />
                    <Text className="text-secondary-foreground text-xs font-medium">
                      {t("expenses.settlement")}
                    </Text>
                  </Badge>
                )}
              </View>
            </CardHeader>
            <CardContent className="gap-4">
              {expense.splitMethod === "settlement" &&
                expense.expenseSplits[0] && (
                  <View className="flex-row items-center gap-3">
                    <MemberAvatar
                      person={memberPerson(
                        expense.expenseSplits[0].groupMember,
                      )}
                      className="h-10 w-10"
                    />
                    <View>
                      <Text className="text-muted-foreground text-sm">
                        {t("expenses.from")}
                      </Text>
                      <Text className="font-semibold">
                        {expense.expenseSplits[0].groupMember.user.name}
                      </Text>
                    </View>
                  </View>
                )}

              <View className="flex-row items-center gap-3">
                <MemberAvatar
                  person={memberPerson(expense.paidByGroupMember)}
                  className="h-10 w-10"
                />
                <View>
                  <Text className="text-muted-foreground text-sm">
                    {expense.splitMethod === "settlement"
                      ? t("expenses.to")
                      : t("expenses.paidByLabel")}
                  </Text>
                  <Text className="text-foreground font-semibold">
                    {expense.paidByGroupMember.user.name}
                  </Text>
                </View>
              </View>

              <Separator />

              <View className="flex-row items-center gap-3">
                <Icon name="calendar" size={20} color="muted-foreground" />
                <View>
                  <Text className="text-muted-foreground text-sm">
                    {t("common.date")}
                  </Text>
                  <Text className="text-foreground font-semibold">
                    {formattedDate}
                  </Text>
                </View>
              </View>

              <Separator />
              <View>
                <Text className="text-muted-foreground mb-1.5 text-sm">
                  {t("common.category")}
                </Text>
                <ExpenseCategoryBadge
                  subcategoryId={expense.subcategory}
                  className="self-start"
                />
              </View>
            </CardContent>
          </Card>

          {/* Split Details Card */}
          {expense.splitMethod !== "settlement" && (
            <Card testID="expense-split-details">
              <CardHeader>
                <View className="flex-row items-center gap-2">
                  <Icon name="users" size={20} color="foreground" />
                  <CardTitle>{t("expenses.splitDetails")}</CardTitle>
                </View>
                <CardDescription>
                  {t("expenses.splitBetween", {
                    count: expense.expenseSplits.length,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  {expense.expenseSplits.map((split, index) => {
                    const member = split.groupMember;
                    const splitAmount = formatCurrencyFromCents({
                      cents: ledger.expenseSplits[index]?.amountInCents ?? 0,
                      currency: ledger.currency,
                      locale,
                    });
                    const paidSplitAmount =
                      amounts.paid &&
                      formatCurrencyFromCents({
                        cents: split.amountInCents,
                        currency: expense.currency,
                        locale,
                      });
                    const portion = formatSplitPortion({
                      split,
                      expense,
                      t,
                      locale,
                    });

                    return (
                      <View key={split.id}>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-3">
                            <MemberAvatar
                              person={memberPerson(member)}
                              className="h-8 w-8"
                            />
                            <View>
                              <Text className="text-foreground font-medium">
                                {member.user.name}
                              </Text>
                              <Text className="text-muted-foreground text-xs">
                                {portion}
                              </Text>
                            </View>
                          </View>
                          <View className="items-end">
                            <Text className="text-foreground font-semibold">
                              {splitAmount}
                            </Text>
                            {paidSplitAmount && (
                              <Text className="text-muted-foreground text-xs">
                                {paidSplitAmount}
                              </Text>
                            )}
                          </View>
                        </View>
                        {index < expense.expenseSplits.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </View>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Created By Card */}
          <Card>
            <CardContent className="pt-6">
              <View className="flex-row items-center gap-3">
                <MemberAvatar
                  person={memberPerson(expense.createdByGroupMember)}
                  className="h-8 w-8"
                />
                <View>
                  <Text className="text-muted-foreground text-sm">
                    {t("expenses.createdBy")}
                  </Text>
                  <Text className="text-foreground text-sm font-medium">
                    {expense.createdByGroupMember.user.name}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </AppScrollView>
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        itemName={expense.description}
        title={t("expenses.deleteExpense")}
        description={t("expenses.deleteExpenseConfirm")}
      />
    </>
  );
}
