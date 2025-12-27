"use client";

import type { SettlementFormValues } from "@flatsby/validators/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@flatsby/ui/sheet";
import { toast } from "@flatsby/ui/toast";
import {
  centsToDecimal,
  decimalToCents,
  formatCurrencyFromCents,
  isCurrencyCode,
  settlementFormSchema,
} from "@flatsby/validators/expense";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

interface SettlementFormProps {
  groupId: number;
  fromGroupMemberId: number;
  toGroupMemberId: number;
  currency: string;
  amountInCents: number;
  onClose: () => void;
  open: boolean;
}

export function SettlementForm({
  groupId,
  fromGroupMemberId,
  toGroupMemberId,
  currency,
  amountInCents,
  onClose,
  open,
}: SettlementFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Get group members for display
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      amountInCents: amountInCents,
    },
  });

  const createSettlementMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Settlement recorded successfully");
          void queryClient.invalidateQueries(
            trpc.expense.getGroupExpenses.queryOptions({ groupId }),
          );
          void queryClient.invalidateQueries(
            trpc.expense.getDebtSummary.queryOptions({ groupId }),
          );
          onClose();
          form.reset();
        } else {
          toast.error("Failed to record settlement", {
            description: data.error.message,
          });
        }
      },
      onError: (error) => {
        toast.error("Failed to record settlement", {
          description: error.message,
        });
      },
    }),
  );

  const onSubmit = (values: SettlementFormValues) => {
    // Settlement: payer (fromGroupMemberId) pays recipient (toGroupMemberId)
    // Data is already in cents
    createSettlementMutation.mutate({
      groupId,
      paidByGroupMemberId: fromGroupMemberId,
      amountInCents: values.amountInCents,
      currency: isCurrencyCode(currency) ? currency : "EUR",
      description: `Settlement payment`,
      expenseDate: new Date(),
      splits: [
        {
          groupMemberId: toGroupMemberId,
          amountInCents: values.amountInCents,
          percentage: null,
        },
      ],
      isSettlement: true,
    });
  };

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const groupMembers = groupData.data.groupMembers;
  const fromMember = groupMembers.find((m) => m.id === fromGroupMemberId);
  const toMember = groupMembers.find((m) => m.id === toGroupMemberId);
  const fromName = fromMember?.user.name ?? "Unknown";
  const toName = toMember?.user.name ?? "Unknown";
  const maxAmountDecimal = centsToDecimal(amountInCents);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Settle Up</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-6"
          >
            {/* Settlement Info */}
            <div className="space-y-4">
              <div className="bg-muted flex items-center justify-between rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      alt={fromName}
                      src={fromMember?.user.image ?? undefined}
                    />
                    <AvatarFallback>
                      {fromName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-muted-foreground text-sm">Paying</p>
                    <p className="font-semibold">{fromName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">Receiving</p>
                  <p className="font-semibold">{toName}</p>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-muted-foreground mb-1 text-sm">
                  Outstanding debt
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrencyFromCents({ cents: amountInCents, currency })}
                </p>
              </div>
            </div>

            {/* Amount Input */}
            <FormField
              control={form.control}
              name="amountInCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Settlement Amount</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{currency}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={maxAmountDecimal}
                        placeholder="0.00"
                        value={
                          field.value
                            ? centsToDecimal(field.value).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const decimalValue = parseFloat(e.target.value) || 0;
                          field.onChange(decimalToCents(decimalValue));
                        }}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Maximum:{" "}
                    {formatCurrencyFromCents({
                      cents: amountInCents,
                      currency,
                    })}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Display */}
            {(createSettlementMutation.isError ||
              createSettlementMutation.data?.success === false) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {createSettlementMutation.data?.success === false
                    ? createSettlementMutation.data.error.message
                    : (createSettlementMutation.error?.message ??
                      "An error occurred")}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createSettlementMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSettlementMutation.isPending}
                className="flex-1"
              >
                {createSettlementMutation.isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Settlement"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
