"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupMemberWithUserInfo,
} from "@flatsby/api";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type { SettlementFormValues } from "@flatsby/validators/expenses/schemas";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flatsby/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@flatsby/ui/sheet";
import { toast } from "@flatsby/ui/toast";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { applySettlement } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  personLookup,
} from "@flatsby/validators/expenses/formatting";
import { settlementFormSchema } from "@flatsby/validators/expenses/schemas";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import { useGroupContext } from "~/app/_components/context/group-context";
import { CurrencyInput } from "~/components/CurrencyInput";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { useExpenseInvalidation } from "../useExpenseInvalidation";

export interface SettlementPrefill {
  debt: DebtEntry;
  source: "direct" | "plan";
}

interface SettlementFormProps {
  /** Without a prefill or an expense the form starts blank, with pickers */
  prefill?: SettlementPrefill;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  open: boolean;
}

export function SettlementForm({
  prefill,
  expense,
  onClose,
  open,
}: SettlementFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { currentGroup } = useGroupContext();
  const handleApiError = useHandleApiError();

  const groupId = currentGroup?.id ?? 0;
  const isEditMode = !!expense;
  const isBlank = !prefill && !expense;

  // Get group members for display
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );
  const directDebts = debtData.success
    ? Object.values(debtData.data.currencies).flatMap(({ direct }) => direct)
    : [];
  const directDebtsBetween = (from: number, to: number) =>
    directDebts.filter(
      (debt) => debt.fromGroupMemberId === from && debt.toGroupMemberId === to,
    );

  const meId = groupData.success ? groupData.data.thisGroupMember.id : 0;
  const initial: DebtEntry = expense
    ? {
        fromGroupMemberId: expense.paidByGroupMemberId,
        toGroupMemberId: expense.expenseSplits[0]?.groupMemberId ?? 0,
        currency: expense.currency,
        amountInCents: expense.amountInCents,
      }
    : (prefill?.debt ?? {
        fromGroupMemberId: meId,
        toGroupMemberId: 0,
        currency: directDebts[0]?.currency ?? "EUR",
        amountInCents: 0,
      });

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      ...initial,
      currency: isCurrencyCode(initial.currency) ? initial.currency : "EUR",
    },
  });

  const {
    expenseListQueryKey,
    debtSummaryQueryKey,
    invalidateList,
    invalidateDebtSummary,
  } = useExpenseInvalidation(groupId);

  const expenseQueryKey = expense
    ? trpc.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  // Get group data early for optimistic updates
  const membersForOptimistic = groupData.success
    ? groupData.data.groupMembers
    : [];
  const currentMember = groupData.success
    ? groupData.data.thisGroupMember
    : null;

  const createSettlementMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onMutate: async (input) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: expenseListQueryKey }),
          queryClient.cancelQueries({ queryKey: debtSummaryQueryKey }),
        ]);

        const previousData = queryClient.getQueryData(expenseListQueryKey);
        const previousDebtSummary =
          queryClient.getQueryData(debtSummaryQueryKey);

        if (previousDebtSummary?.success) {
          const optimistic: typeof previousDebtSummary = {
            success: true,
            data: applySettlement(previousDebtSummary.data, {
              fromGroupMemberId: input.paidByGroupMemberId,
              toGroupMemberId: input.splits[0]?.groupMemberId ?? 0,
              currency: input.currency,
              amountInCents: input.amountInCents,
            }),
          };
          queryClient.setQueryData(debtSummaryQueryKey, optimistic);
        }

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

          const optimisticSettlement: ExpenseWithSplitsAndMembers & {
            isPending: true;
          } = {
            id: Date.now(),
            groupId,
            paidByGroupMemberId: input.paidByGroupMemberId,
            amountInCents: input.amountInCents,
            currency: input.currency,
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

        return { previousData, previousDebtSummary };
      },
      onError: (error, _variables, context) => {
        if (context) {
          queryClient.setQueryData(expenseListQueryKey, context.previousData);
          queryClient.setQueryData(
            debtSummaryQueryKey,
            context.previousDebtSummary,
          );
        }
        toast.error("Failed to record settlement", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          queryClient.setQueryData(expenseListQueryKey, context.previousData);
          queryClient.setQueryData(
            debtSummaryQueryKey,
            context.previousDebtSummary,
          );
          toast.error("Failed to record settlement", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Settlement recorded successfully");
        void invalidateList();
        void invalidateDebtSummary();
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

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData && expenseQueryKey) {
          queryClient.setQueryData(expenseQueryKey, context.previousData);
        }
        toast.error("Failed to update settlement", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context?.previousData && expenseQueryKey) {
            queryClient.setQueryData(expenseQueryKey, context.previousData);
          }
          toast.error("Failed to update settlement", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Settlement updated successfully");
        void queryClient.invalidateQueries({
          queryKey: expenseQueryKey,
        });
        void invalidateDebtSummary();
        onClose();
      },
    }),
  );

  const onSubmit = (values: SettlementFormValues) => {
    const splits = [
      {
        groupMemberId: values.toGroupMemberId,
        amountInCents: values.amountInCents,
        percentage: null,
      },
    ];
    if (isEditMode) {
      updateSettlementMutation.mutate({
        expenseId: expense.id,
        paidByGroupMemberId: values.fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        expenseDate: expense.expenseDate,
        splits,
        splitMethod: "settlement",
      });
    } else {
      createSettlementMutation.mutate({
        groupId,
        paidByGroupMemberId: values.fromGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: "Settlement",
        expenseDate: new Date(),
        splits,
        splitMethod: "settlement",
      });
    }
  };

  const fromGroupMemberId = form.watch("fromGroupMemberId");
  const toGroupMemberId = form.watch("toGroupMemberId");
  const currency = form.watch("currency");

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const groupMembers = groupData.data.groupMembers;
  const person = personLookup(groupMembers, meId);
  const fromMember = person(fromGroupMemberId);
  const toMember = person(toGroupMemberId);

  const selectPair = (from: number, to: number) => {
    form.setValue("fromGroupMemberId", from);
    form.setValue("toGroupMemberId", to);
    const pairCurrency = directDebtsBetween(from, to)
      .map((debt) => debt.currency)
      .find(isCurrencyCode);
    if (pairCurrency) form.setValue("currency", pairCurrency);
  };

  const directLabel = (from: number, to: number) => {
    if (from === meId) return `You owe ${person(to).name} directly`;
    if (to === meId) return `${person(from).name} owes you directly`;
    return `${person(from).name} owes ${person(to).name} directly`;
  };

  let outstanding: { label: string; amountInCents: number } | undefined;
  if (prefill) {
    outstanding = {
      label:
        prefill.source === "plan"
          ? "Settle plan payment"
          : directLabel(fromGroupMemberId, toGroupMemberId),
      amountInCents: prefill.debt.amountInCents,
    };
  } else if (isBlank) {
    const debt = directDebtsBetween(fromGroupMemberId, toGroupMemberId).find(
      (d) => d.currency === currency,
    );
    if (debt) {
      outstanding = {
        label: directLabel(fromGroupMemberId, toGroupMemberId),
        amountInCents: debt.amountInCents,
      };
    }
  }

  const isPending =
    createSettlementMutation.isPending || updateSettlementMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        className="w-full sm:max-w-lg"
        data-testid="settlement-form"
      >
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Edit Settlement" : "Settle Up"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-6 px-4"
          >
            <div className="space-y-4">
              {isBlank ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromGroupMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paying</FormLabel>
                        <MemberSelect
                          value={field.value}
                          members={groupMembers}
                          person={person}
                          placeholder="Who pays?"
                          onChange={(from) =>
                            selectPair(
                              from,
                              from === toGroupMemberId ? 0 : toGroupMemberId,
                            )
                          }
                          testId="settlement-from-select"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toGroupMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receiving</FormLabel>
                        <MemberSelect
                          value={field.value}
                          members={groupMembers.filter(
                            (member) => member.id !== fromGroupMemberId,
                          )}
                          person={person}
                          placeholder="Who receives?"
                          onChange={(to) => selectPair(fromGroupMemberId, to)}
                          testId="settlement-to-select"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="bg-muted flex items-center justify-between rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={fromMember.name}
                      image={fromMember.image}
                    />
                    <div>
                      <p className="text-muted-foreground text-sm">Paying</p>
                      <p className="font-semibold">{fromMember.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">Receiving</p>
                    <p className="font-semibold">{toMember.name}</p>
                  </div>
                </div>
              )}

              {outstanding && (
                <div
                  className="bg-muted rounded-lg p-4 text-center"
                  data-testid="settlement-outstanding"
                >
                  <p className="text-muted-foreground mb-1 text-sm">
                    {outstanding.label}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrencyFromCents({
                      cents: outstanding.amountInCents,
                      currency,
                    })}
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="amountInCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Settlement Amount</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      {isBlank ? (
                        <Select
                          value={currency}
                          onValueChange={(value) => {
                            if (isCurrencyCode(value)) {
                              form.setValue("currency", value);
                            }
                          }}
                        >
                          <SelectTrigger
                            className="w-24"
                            data-testid="settlement-currency-select"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_CODES.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">
                          {currency}
                        </span>
                      )}
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0.00"
                        min={1}
                        max={prefill?.debt.amountInCents}
                        className="flex-1"
                        data-testid="settlement-amount-input"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Display */}
            {(createSettlementMutation.isError ||
              updateSettlementMutation.isError ||
              createSettlementMutation.data?.success === false ||
              updateSettlementMutation.data?.success === false) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {createSettlementMutation.data?.success === false
                    ? createSettlementMutation.data.error.message
                    : updateSettlementMutation.data?.success === false
                      ? updateSettlementMutation.data.error.message
                      : (createSettlementMutation.error?.message ??
                        updateSettlementMutation.error?.message ??
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
                disabled={isPending}
                className="flex-1"
                data-testid="settlement-cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1"
                data-testid="settlement-record-button"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Recording..."}
                  </>
                ) : isEditMode ? (
                  "Update Settlement"
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

interface MemberSelectProps {
  value: number;
  members: GroupMemberWithUserInfo[];
  person: PersonLookup;
  placeholder: string;
  onChange: (groupMemberId: number) => void;
  testId: string;
}

function MemberSelect({
  value,
  members,
  person,
  placeholder,
  onChange,
  testId,
}: MemberSelectProps) {
  return (
    <Select
      value={value ? String(value) : ""}
      onValueChange={(next) => onChange(Number(next))}
    >
      <FormControl>
        <SelectTrigger className="w-full" data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {members.map((member) => {
          const { name, image } = person(member.id);
          return (
            <SelectItem key={member.id} value={String(member.id)}>
              <div className="flex items-center gap-2">
                <UserAvatar name={name} image={image} size="xs" />
                {name}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
