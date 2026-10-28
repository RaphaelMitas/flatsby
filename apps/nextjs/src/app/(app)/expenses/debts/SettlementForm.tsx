"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupMemberWithUserInfo,
} from "@flatsby/api";
import type { DebtKind } from "@flatsby/validators/expenses/debt";
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
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import {
  failureOf,
  restoreSnapshot,
  resultMutation,
} from "@flatsby/api/resultMutation";
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
import { applySettlement, pairDebt } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  personLookup,
  settleOutstandingLabel,
} from "@flatsby/validators/expenses/formatting";
import { settlementFormSchema } from "@flatsby/validators/expenses/schemas";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";

import { useGroupContext } from "~/app/_components/context/group-context";
import { CurrencyInput } from "~/components/CurrencyInput";
import { CurrencySelect } from "~/components/CurrencySelect";
import { useTRPC } from "~/trpc/react";
import { useExpenseInvalidation } from "../useExpenseInvalidation";
import { SettlementPayment } from "./SettlementPayment";

export interface SettlementPrefill {
  debt: DebtEntry;
  source: DebtKind;
}

interface SettlementFormProps {
  prefill?: SettlementPrefill;
  onClose: () => void;
}

export function SettlementForm({ prefill, onClose }: SettlementFormProps) {
  const trpc = useTRPC();
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { currentGroup } = useGroupContext();

  const groupId = currentGroup?.id ?? 0;
  const isBlank = !prefill;

  // Get group members for display
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );
  const debtBetween = (from: number, to: number, currency?: string) =>
    debtData.success ? pairDebt(debtData.data, from, to, currency) : undefined;

  const meId = groupData.success ? groupData.data.thisGroupMember.id : 0;
  const groupCurrency = groupData.success ? groupData.data.currency : "EUR";
  const initial: DebtEntry = prefill?.debt ?? {
    fromGroupMemberId: 0,
    toGroupMemberId: 0,
    currency: groupCurrency,
    amountInCents: 0,
  };

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      ...initial,
      currency: isCurrencyCode(initial.currency)
        ? initial.currency
        : groupCurrency,
    },
  });

  const {
    expenseListQueryKey,
    debtSummaryQueryKey,
    invalidateList,
    invalidateDebtSummary,
  } = useExpenseInvalidation(groupId);

  // Get group data early for optimistic updates
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
            { queryKey: expenseListQueryKey, previous: previousData },
            { queryKey: debtSummaryQueryKey, previous: previousDebtSummary },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          toast.error(t("debts.recordFailed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: () => {
          toast.success(t("debts.recordSuccess"));
          onClose();
        },
        onSettled: () => {
          void invalidateList();
          void invalidateDebtSummary();
        },
      }),
    ),
  );

  const onSubmit = (values: SettlementFormValues) => {
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
  };

  const fromGroupMemberId = form.watch("fromGroupMemberId");
  const toGroupMemberId = form.watch("toGroupMemberId");
  const currency = form.watch("currency");
  const amountInCents = form.watch("amountInCents");

  if (!groupData.success) {
    return null;
  }

  const groupMembers = groupData.data.groupMembers;
  const person = personLookup(groupMembers, meId, t);
  const fromMember = person(fromGroupMemberId);
  const toMember = person(toGroupMemberId);

  const selectPair = (from: number, to: number) => {
    const options = { shouldValidate: form.formState.isSubmitted };
    form.setValue("fromGroupMemberId", from, options);
    form.setValue("toGroupMemberId", to, options);
    const pairCurrency = debtBetween(from, to)?.currency;
    if (pairCurrency && isCurrencyCode(pairCurrency)) {
      form.setValue("currency", pairCurrency);
    }
  };

  const outstanding =
    prefill?.debt ?? debtBetween(fromGroupMemberId, toGroupMemberId, currency);

  const isPending = createSettlementMutation.isPending;
  const receiverPaypal =
    groupMembers.find((member) => member.id === toGroupMemberId)?.user
      .paypalHandle ?? null;
  const payingWithPaypal =
    fromGroupMemberId === meId && amountInCents > 0 && !!receiverPaypal;
  const failure = failureOf(
    createSettlementMutation,
    t("expenses.genericError"),
  );

  return (
    <Sheet open onOpenChange={(open) => !open && !isPending && onClose()}>
      <SheetContent
        className="w-full sm:max-w-lg"
        data-testid="settlement-form"
      >
        <SheetHeader>
          <SheetTitle>{t("debts.settleUp")}</SheetTitle>
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
                        <FormLabel>{t("debts.paying")}</FormLabel>
                        <MemberSelect
                          value={field.value}
                          members={groupMembers}
                          person={person}
                          placeholder={t("debts.whoPays")}
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
                        <FormLabel>{t("debts.receiving")}</FormLabel>
                        <MemberSelect
                          value={field.value}
                          members={groupMembers.filter(
                            (member) => member.id !== fromGroupMemberId,
                          )}
                          person={person}
                          placeholder={t("debts.whoReceives")}
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
                      <p className="text-muted-foreground text-sm">
                        {t("debts.paying")}
                      </p>
                      <p className="font-semibold">{fromMember.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">
                      {t("debts.receiving")}
                    </p>
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
                    {settleOutstandingLabel(
                      prefill?.source ?? "direct",
                      outstanding,
                      meId,
                      person,
                      t,
                    )}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrencyFromCents({
                      cents: outstanding.amountInCents,
                      currency: outstanding.currency,
                      locale,
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
                  <FormLabel>{t("debts.settlementAmount")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      {isBlank ? (
                        <CurrencySelect
                          className="w-24"
                          data-testid="settlement-currency-select"
                          value={currency}
                          onChange={(value) => form.setValue("currency", value)}
                        />
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

            {fromGroupMemberId > 0 && toGroupMemberId > 0 && (
              <SettlementPayment
                paypalHandle={receiverPaypal}
                receiverName={toMember.name}
                receiverIsMe={toGroupMemberId === meId}
                amountInCents={amountInCents}
                currency={currency}
              />
            )}

            {/* Error Display */}
            {failure && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("common.error")}</AlertTitle>
                <AlertDescription>{failure}</AlertDescription>
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
                {t("common.cancel")}
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
                    {t("debts.recording")}
                  </>
                ) : payingWithPaypal ? (
                  t("debts.pay.paidRecord")
                ) : (
                  t("debts.recordSettlement")
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
