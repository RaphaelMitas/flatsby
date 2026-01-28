import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Separator } from "~/lib/ui/separator";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

interface ExpenseDetailViewProps {
  expenseId: number;
  groupId: number;
  /** Callback when navigating back (for splitview mode). If not provided, uses router.back() */
  onBack?: () => void;
  /** Callback when editing (for splitview mode). If not provided, navigates to edit page */
  onEdit?: () => void;
}

export function ExpenseDetailView({
  expenseId,
  groupId,
  onBack,
  onEdit,
}: ExpenseDetailViewProps) {
  const router = useRouter();
  const trpcClient = trpc;
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: groupData } = useSuspenseQuery(
    trpcClient.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data: expenseData } = useSuspenseQuery(
    trpcClient.expense.getExpense.queryOptions({ expenseId }),
  );

  // Query key for expense list
  const expenseListQueryKey =
    trpcClient.expense.getGroupExpenses.infiniteQueryKey({
      groupId,
      limit: 20,
    });

  const deleteExpenseMutation = useMutation(
    trpcClient.expense.deleteExpense.mutationOptions({
      onMutate: async (input) => {
        // Cancel any outgoing queries
        await queryClient.cancelQueries(
          trpcClient.expense.getGroupExpenses.queryOptions({
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
      },
      onSuccess: (data) => {
        if (data.success === false) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        void queryClient.invalidateQueries(
          trpcClient.expense.getDebtSummary.queryOptions({ groupId }),
        );
        if (onBack) {
          onBack();
        } else {
          router.back();
        }
      },
    }),
  );

  const handleDelete = () => {
    deleteExpenseMutation.mutate({ expenseId });
    setShowDeleteDialog(false);
  };

  if (!expenseData.success) {
    return handleApiError({
      router,
      error: expenseData.error,
    });
  }

  if (!groupData.success) {
    return handleApiError({
      router,
      error: groupData.error,
    });
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
    <>
      <View className="h-full gap-4">
        <View className="flex-row gap-2">
          <Button
            title="Edit"
            variant="outline"
            onPress={() => {
              if (onEdit) {
                onEdit();
              } else {
                router.push({
                  pathname: "/(tabs)/expenses/[expenseId]/edit",
                  params: { expenseId: expenseId.toString() },
                });
              }
            }}
            className="flex-1"
            disabled={deleteExpenseMutation.isPending}
            icon="pencil"
          />
          <Button
            title="Delete"
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
                  <CardTitle className="text-2xl">{formattedAmount}</CardTitle>
                  {expense.description && (
                    <CardDescription className="mt-2 text-base">
                      {expense.description}
                    </CardDescription>
                  )}
                </View>
                {expense.splitMethod === "settlement" && (
                  <View className="bg-muted-foreground/20 rounded px-3 py-1">
                    <Text className="text-muted-foreground text-xs">
                      Settlement
                    </Text>
                  </View>
                )}
              </View>
            </CardHeader>
            <CardContent className="gap-4">
              {expense.splitMethod === "settlement" &&
                expense.expenseSplits[0] && (
                  <View className="flex-row items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
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
                    <View>
                      <Text className="text-muted-foreground text-sm">
                        From
                      </Text>
                      <Text className="font-semibold">
                        {expense.expenseSplits[0].groupMember.user.name}
                      </Text>
                    </View>
                  </View>
                )}

              <View className="flex-row items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={expense.paidByGroupMember.user.image ?? undefined}
                  />
                  <AvatarFallback>
                    {expense.paidByGroupMember.user.name
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <View>
                  <Text className="text-muted-foreground text-sm">
                    {expense.splitMethod === "settlement" ? "To" : "Paid by"}
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
                  <Text className="text-muted-foreground text-sm">Date</Text>
                  <Text className="text-foreground font-semibold">
                    {formattedDate}
                  </Text>
                </View>
              </View>

              {expense.category && (
                <>
                  <Separator />
                  <View>
                    <Text className="text-muted-foreground text-sm">
                      Category
                    </Text>
                    <Text className="text-foreground font-semibold capitalize">
                      {expense.category}
                    </Text>
                  </View>
                </>
              )}
            </CardContent>
          </Card>

          {/* Split Details Card */}
          {expense.splitMethod !== "settlement" && (
            <Card>
              <CardHeader>
                <View className="flex-row items-center gap-2">
                  <Icon name="users" size={20} color="foreground" />
                  <CardTitle>Split Details</CardTitle>
                </View>
                <CardDescription>
                  {`Split between ${expense.expenseSplits.length} ${expense.expenseSplits.length === 1 ? "person" : "people"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  {expense.expenseSplits.map((split, index) => {
                    const member = split.groupMember;
                    const splitAmount = formatCurrencyFromCents({
                      cents: split.amountInCents,
                      currency: expense.currency,
                    });
                    const percentage =
                      (split.amountInCents / expense.amountInCents) * 100;

                    return (
                      <View key={split.id}>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={member.user.image ?? undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {member.user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <View>
                              <Text className="text-foreground font-medium">
                                {member.user.name}
                              </Text>
                              <Text className="text-muted-foreground text-xs">
                                {percentage.toFixed(1)}%
                              </Text>
                            </View>
                          </View>
                          <Text className="text-foreground font-semibold">
                            {splitAmount}
                          </Text>
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
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={expense.createdByGroupMember.user.image ?? undefined}
                  />
                  <AvatarFallback className="text-xs">
                    {expense.createdByGroupMember.user.name
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <View>
                  <Text className="text-muted-foreground text-sm">
                    Created by
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
        itemName={expense.description ?? formattedAmount}
        title="Delete Expense"
        description={`Are you sure you want to delete this expense? This action cannot be undone.`}
      />
    </>
  );
}
