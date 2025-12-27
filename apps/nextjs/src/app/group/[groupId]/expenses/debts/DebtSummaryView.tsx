"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type { GroupDebtSummary } from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Separator } from "@flatsby/ui/separator";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { SettlementForm } from "./SettlementForm";

interface DebtSummaryViewProps {
  groupId: number;
}

export function DebtSummaryView({ groupId }: DebtSummaryViewProps) {
  const trpc = useTRPC();
  const [selectedDebt, setSelectedDebt] = useState<{
    fromGroupMemberId: number;
    toGroupMemberId: number;
    currency: string;
    amountInCents: number;
  } | null>(null);

  // Get debt summary
  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  // Get group members for display
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!debtData.success) {
    return handleApiError(debtData.error);
  }

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const debtSummary: GroupDebtSummary = debtData.data;
  const groupMembers = groupData.data.groupMembers;
  const currencies = Object.keys(debtSummary.currencies);

  // Create member lookup map
  const memberMap = new Map<number, GroupMemberWithUserInfo>();
  groupMembers.forEach((member) => {
    memberMap.set(member.id, member);
  });

  const getMemberName = (memberId: number): string => {
    return memberMap.get(memberId)?.user.name ?? "Unknown";
  };

  const hasAnyDebts = currencies.some((currency) =>
    debtSummary.currencies[currency]
      ? debtSummary.currencies[currency].debts.length > 0
      : false,
  );

  return (
    <div className="flex w-full max-w-prose flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Debt Summary
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Simplified view of who owes whom
        </p>
      </div>

      {!hasAnyDebts ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <CheckCircle2 className="text-muted-foreground h-12 w-12" />
              <div>
                <p className="text-lg font-semibold">All settled up!</p>
                <p className="text-muted-foreground text-sm">
                  No outstanding debts in this group
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {currencies.map((currency) => {
            const currencyDebts = debtSummary.currencies[currency];
            if (!currencyDebts || currencyDebts.debts.length === 0) {
              return null;
            }

            return (
              <Card key={currency}>
                <CardHeader>
                  <CardTitle className="text-lg">{currency}</CardTitle>
                  <CardDescription>
                    {currencyDebts.debts.length}{" "}
                    {currencyDebts.debts.length === 1 ? "debt" : "debts"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currencyDebts.debts.map((debt, index) => {
                      const formattedAmount = formatCurrencyFromCents({
                        cents: debt.amountInCents,
                        currency,
                      });

                      return (
                        <div
                          key={`${debt.fromGroupMemberId}-${debt.toGroupMemberId}-${index}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <div className="truncate text-sm font-medium">
                                  {getMemberName(debt.fromGroupMemberId)}
                                </div>
                                <ArrowRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                                <div className="truncate text-sm font-medium">
                                  {getMemberName(debt.toGroupMemberId)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold">
                                {formattedAmount}
                              </span>
                              <button
                                onClick={() =>
                                  setSelectedDebt({
                                    fromGroupMemberId: debt.fromGroupMemberId,
                                    toGroupMemberId: debt.toGroupMemberId,
                                    currency,
                                    amountInCents: debt.amountInCents,
                                  })
                                }
                                className="text-primary text-sm hover:underline"
                              >
                                Settle Up
                              </button>
                            </div>
                          </div>
                          {index < currencyDebts.debts.length - 1 && (
                            <Separator className="mt-3" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Member Balances Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Member Balances</CardTitle>
              <CardDescription>
                Net balance for each member by currency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupMembers.map((member) => {
                  const balances = debtSummary.memberBalances[member.id] ?? {};
                  const hasBalances = Object.keys(balances).length > 0;

                  if (!hasBalances) return null;

                  return (
                    <div key={member.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-medium">{member.user.name}</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        {Object.entries(balances).map(([currency, balance]) => {
                          const formattedBalance = formatCurrencyFromCents({
                            cents: balance,
                            currency,
                          });
                          const isPositive = balance > 0;
                          const isZero = balance === 0;

                          return (
                            <div
                              key={currency}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                {currency}:
                              </span>
                              <span
                                className={`font-semibold ${
                                  isZero
                                    ? ""
                                    : isPositive
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {isZero
                                  ? formattedBalance
                                  : isPositive
                                    ? `+${formattedBalance}`
                                    : formattedBalance}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settlement Form */}
      {selectedDebt && (
        <SettlementForm
          groupId={groupId}
          fromGroupMemberId={selectedDebt.fromGroupMemberId}
          toGroupMemberId={selectedDebt.toGroupMemberId}
          currency={selectedDebt.currency}
          amountInCents={selectedDebt.amountInCents}
          onClose={() => setSelectedDebt(null)}
          open={!!selectedDebt}
        />
      )}
    </div>
  );
}
