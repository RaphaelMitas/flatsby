"use client";

import type {
  PendingExpense,
  PersistedToolCallOutputUpdate,
} from "@flatsby/validators/chat/tools";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";

import { Alert, AlertDescription } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { distributeEqualAmounts } from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { CurrencyInput } from "~/components/CurrencyInput";
import { useTRPC } from "~/trpc/react";

interface SplitEditorSelectorProps {
  pendingExpense: PendingExpense;
  groupId: number;
  conversationId: string;
  messageId: string; // AI SDK message ID (for local state updates)
  dbMessageId: string; // Database message ID (UUID, for DB updates)
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

export function SplitEditorSelector({
  pendingExpense,
  groupId,
  conversationId,
  messageId,
  dbMessageId,
  toolCallId,
  updateToolCallOutput,
  disabled = false,
}: SplitEditorSelectorProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Initialize editable splits from pending expense
  const [splits, setSplits] = useState<EditableSplit[]>(
    pendingExpense.splits.map((s) => ({
      groupMemberId: s.groupMemberId,
      memberName: s.memberName,
      amountInCents: s.amountInCents,
    })),
  );

  // Calculate totals
  const totalSplitCents = splits.reduce((sum, s) => sum + s.amountInCents, 0);
  const isValid = totalSplitCents === pendingExpense.amountInCents;
  const difference = pendingExpense.amountInCents - totalSplitCents;

  // Mutation to update tool call in database
  const updateDbToolCall = useMutation(
    trpc.chat.updateToolCallOutput.mutationOptions(),
  );

  // Create expense mutation - handles everything in callbacks
  const createExpenseMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onMutate: () => {
        // Optimistic: hide the split editor immediately
        updateToolCallOutput(messageId, toolCallId, {
          userShouldConfirmSplits: false,
          pendingExpense: null,
        });
        // Return context for potential rollback
        return { pendingExpense };
      },
      onSuccess: async (data, _variables, context) => {
        if (!data.success) {
          // Rollback on server error
          updateToolCallOutput(messageId, toolCallId, {
            userShouldConfirmSplits: true,
            pendingExpense: context.pendingExpense,
          });
          return;
        }

        // Update local state with expense ID
        updateToolCallOutput(messageId, toolCallId, {
          expenseId: data.data.id,
        });

        // Persist to database
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
        // Rollback: restore the split editor
        if (context?.pendingExpense) {
          updateToolCallOutput(messageId, toolCallId, {
            userShouldConfirmSplits: true,
            pendingExpense: context.pendingExpense,
          });
        }
      },
    }),
  );

  // Cancel mutation - handles everything in callbacks
  const cancelMutation = useMutation(
    trpc.chat.updateToolCallOutput.mutationOptions({
      onMutate: () => {
        // Optimistic: hide immediately
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

  const handleSplitChange = (groupMemberId: number, amountInCents: number) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.groupMemberId === groupMemberId ? { ...s, amountInCents } : s,
      ),
    );
  };

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
  const mutationError =
    createExpenseMutation.error?.message ??
    cancelMutation.error?.message ??
    (createExpenseMutation.data?.success === false
      ? createExpenseMutation.data.error.message
      : undefined);

  return (
    <Card className="my-2 max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {pendingExpense.description}
        </CardTitle>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            {formatCurrencyFromCents({
              cents: pendingExpense.amountInCents,
              currency: pendingExpense.currency,
            })}
          </span>
          <span className="flex items-center gap-1">
            Paid by{" "}
            <span className="font-medium">
              {pendingExpense.paidByMemberName}
            </span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Split amounts */}
        {splits.map((split) => (
          <div key={split.groupMemberId} className="flex items-center gap-2">
            <UserAvatar name={split.memberName} size="sm" />
            <span className="flex-1 truncate text-sm">{split.memberName}</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-xs">
                {pendingExpense.currency}
              </span>
              <CurrencyInput
                value={split.amountInCents}
                onChange={(cents) =>
                  handleSplitChange(split.groupMemberId, cents)
                }
                className="w-20 text-right text-sm"
                min={0}
                max={pendingExpense.amountInCents}
                disabled={disabled || isPending}
              />
            </div>
          </div>
        ))}

        {/* Validation status */}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-muted-foreground text-xs">Total:</span>
          <span
            className={`text-sm font-medium ${isValid ? "text-green-600" : "text-destructive"}`}
          >
            {formatCurrencyFromCents({
              cents: totalSplitCents,
              currency: pendingExpense.currency,
            })}
          </span>
        </div>

        {!isValid && (
          <div className="text-destructive flex items-center gap-1 text-xs">
            <AlertCircle className="size-3" />
            {difference > 0 ? (
              <span>
                {formatCurrencyFromCents({
                  cents: difference,
                  currency: pendingExpense.currency,
                })}{" "}
                remaining to allocate
              </span>
            ) : (
              <span>
                Over by{" "}
                {formatCurrencyFromCents({
                  cents: Math.abs(difference),
                  currency: pendingExpense.currency,
                })}
              </span>
            )}
          </div>
        )}

        {mutationError && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">
              {mutationError}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDistributeEqually}
            disabled={disabled || isPending}
            className="flex-1"
          >
            Split Equally
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1"
          >
            <X className="mr-1 size-3" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={disabled || isPending || !isValid}
            className="flex-1"
          >
            {isPending ? (
              <>
                <LoaderCircle className="mr-1 size-3 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-1 size-3" />
                Confirm
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
