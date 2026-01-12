import type {
  PendingExpense,
  PersistedToolCallOutputUpdate,
} from "@flatsby/validators/chat/tools";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { distributeEqualAmounts } from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { CurrencyInput } from "~/components/expenses/CurrencyInput";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/lib/ui/accordion";
import { Avatar, AvatarFallback } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";

interface SplitEditorSheetProps {
  pendingExpense: PendingExpense;
  groupId: number;
  conversationId: string;
  messageId: string;
  dbMessageId: string;
  toolCallId: string;
  updateToolCallOutput: (
    messageId: string,
    toolCallId: string,
    outputUpdate: PersistedToolCallOutputUpdate,
  ) => void;
  disabled?: boolean;
}

interface EditableSplit {
  groupMemberId: number;
  memberName: string;
  amountInCents: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SplitEditorSheet({
  pendingExpense,
  groupId,
  conversationId,
  messageId,
  dbMessageId,
  toolCallId,
  updateToolCallOutput,
  disabled = false,
}: SplitEditorSheetProps) {
  const queryClient = useQueryClient();

  const [splits, setSplits] = useState<EditableSplit[]>(
    pendingExpense.splits.map((s) => ({
      groupMemberId: s.groupMemberId,
      memberName: s.memberName,
      amountInCents: s.amountInCents,
    })),
  );

  const totalSplitCents = splits.reduce((sum, s) => sum + s.amountInCents, 0);
  const isValid = totalSplitCents === pendingExpense.amountInCents;
  const difference = pendingExpense.amountInCents - totalSplitCents;

  const handleSplitChange = useCallback(
    (groupMemberId: number, cents: number) => {
      setSplits((prev) =>
        prev.map((s) =>
          s.groupMemberId === groupMemberId
            ? { ...s, amountInCents: cents }
            : s,
        ),
      );
    },
    [],
  );

  const updateDbToolCall = useMutation(
    trpc.chat.updateToolCallOutput.mutationOptions(),
  );

  const createExpenseMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onMutate: () => {
        updateToolCallOutput(messageId, toolCallId, {
          userShouldConfirmSplits: false,
          pendingExpense: null,
        });
        return { pendingExpense };
      },
      onSuccess: async (data, _variables, context) => {
        if (!data.success) {
          updateToolCallOutput(messageId, toolCallId, {
            userShouldConfirmSplits: true,
            pendingExpense: context.pendingExpense,
          });
          return;
        }

        updateToolCallOutput(messageId, toolCallId, {
          expenseId: data.data.id,
        });

        await updateDbToolCall.mutateAsync({
          messageId: dbMessageId,
          toolCallId,
          outputUpdate: {
            expenseId: data.data.id,
            userShouldConfirmSplits: false,
            pendingExpense: null,
          },
        });

        void queryClient.invalidateQueries({
          queryKey: trpc.expense.getGroupExpenses.queryKey({ groupId }),
        });
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId }),
        );
        void queryClient.invalidateQueries(
          trpc.chat.getConversation.queryOptions({ conversationId }),
        );
      },
      onError: (_error, _variables, context) => {
        if (context?.pendingExpense) {
          updateToolCallOutput(messageId, toolCallId, {
            userShouldConfirmSplits: true,
            pendingExpense: context.pendingExpense,
          });
        }
      },
    }),
  );

  const cancelMutation = useMutation(
    trpc.chat.updateToolCallOutput.mutationOptions({
      onMutate: () => {
        updateToolCallOutput(messageId, toolCallId, {
          userShouldConfirmSplits: false,
          pendingExpense: null,
          cancelled: true,
        });
        return { pendingExpense };
      },
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.chat.getConversation.queryOptions({ conversationId }),
        );
      },
      onError: (_error, _variables, context) => {
        if (context?.pendingExpense) {
          updateToolCallOutput(messageId, toolCallId, {
            userShouldConfirmSplits: true,
            pendingExpense: context.pendingExpense,
          });
        }
      },
    }),
  );

  const handleDistributeEqually = () => {
    const memberIds = splits.map((s) => s.groupMemberId);
    const equalSplits = distributeEqualAmounts(
      memberIds,
      pendingExpense.amountInCents,
    );

    setSplits((prev) =>
      prev.map((s) => {
        const equalSplit = equalSplits.find(
          (e) => e.groupMemberId === s.groupMemberId,
        );
        return equalSplit
          ? { ...s, amountInCents: equalSplit.amountInCents }
          : s;
      }),
    );
  };

  const handleConfirm = () => {
    if (!isValid) return;
    createExpenseMutation.mutate({
      groupId,
      paidByGroupMemberId: pendingExpense.paidByGroupMemberId,
      amountInCents: pendingExpense.amountInCents,
      currency: pendingExpense.currency,
      description: pendingExpense.description,
      expenseDate: new Date(),
      splits: splits.map((s) => ({
        groupMemberId: s.groupMemberId,
        amountInCents: s.amountInCents,
        percentage: null,
      })),
      splitMethod: "custom",
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate({
      messageId: dbMessageId,
      toolCallId,
      outputUpdate: {
        userShouldConfirmSplits: false,
        pendingExpense: null,
        cancelled: true,
      },
    });
  };

  const isPending = createExpenseMutation.isPending || cancelMutation.isPending;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          <Text className="text-foreground text-sm font-medium">
            {pendingExpense.description}
          </Text>
        </CardTitle>
        <View className="flex-row items-center justify-between">
          <Text className="text-muted-foreground text-xs">
            {formatCurrencyFromCents({
              cents: pendingExpense.amountInCents,
              currency: pendingExpense.currency,
            })}
          </Text>
          <Text className="text-muted-foreground text-xs">
            Paid by {pendingExpense.paidByMemberName}
          </Text>
        </View>
      </CardHeader>

      <CardContent className="gap-2 pt-0">
        {/* Split rows */}
        <Accordion type="single" collapsible disabled={disabled || isPending}>
          {splits.map((split) => (
            <AccordionItem
              key={split.groupMemberId}
              value={String(split.groupMemberId)}
            >
              <AccordionTrigger className="py-3">
                <View className="flex-row items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>
                      <Text className="text-xs">
                        {getInitials(split.memberName)}
                      </Text>
                    </AvatarFallback>
                  </Avatar>
                  <Text className="text-foreground text-sm" numberOfLines={1}>
                    {split.memberName}
                  </Text>
                </View>
                <View className="mr-2 ml-auto">
                  <Text className="text-foreground text-sm font-medium">
                    {formatCurrencyFromCents({
                      cents: split.amountInCents,
                      currency: pendingExpense.currency,
                    })}
                  </Text>
                </View>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pl-8">
                <CurrencyInput
                  value={split.amountInCents}
                  onChange={(cents) =>
                    handleSplitChange(split.groupMemberId, cents)
                  }
                  disabled={disabled || isPending}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Validation status */}
        <View className="border-border flex-row items-center justify-between border-t pt-2">
          <Text className="text-muted-foreground text-xs">Total:</Text>
          <Text
            className={`text-sm font-medium ${isValid ? "text-success" : "text-destructive"}`}
          >
            {formatCurrencyFromCents({
              cents: totalSplitCents,
              currency: pendingExpense.currency,
            })}
          </Text>
        </View>

        {!isValid && (
          <View className="flex-row items-center gap-1">
            <Icon name="circle-alert" size={12} color="destructive" />
            <Text className="text-destructive text-xs">
              {difference > 0
                ? `${formatCurrencyFromCents({
                    cents: difference,
                    currency: pendingExpense.currency,
                  })} remaining`
                : `Over by ${formatCurrencyFromCents({
                    cents: Math.abs(difference),
                    currency: pendingExpense.currency,
                  })}`}
            </Text>
          </View>
        )}

        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onPress={handleDistributeEqually}
          disabled={disabled || isPending}
          title="Split Equally"
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="outline"
              size="sm"
              onPress={handleCancel}
              disabled={isPending}
              title="Cancel"
              icon="x"
            />
          </View>
          <View className="flex-1">
            <Button
              variant="primary"
              size="sm"
              onPress={handleConfirm}
              disabled={disabled || isPending || !isValid}
              title={isPending ? "Creating..." : "Confirm"}
              icon={isPending ? "loader" : "check"}
            />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
