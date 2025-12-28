"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

interface UserDebtSummaryProps {
  groupId: number;
}

export function UserDebtSummary({ groupId }: UserDebtSummaryProps) {
  const trpc = useTRPC();

  // Get group data to find current user's group member ID
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  // Get member's debts
  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({
      groupId,
    }),
  );

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const currentGroupMemberId = groupData.data.thisGroupMember.id;

  if (!debtData.success) {
    return handleApiError(debtData.error);
  }

  const memberBalances =
    debtData.data.memberBalances[currentGroupMemberId] ?? {};
  const currencies = Object.keys(memberBalances);
  const hasBalances = currencies.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Your Balance
            </CardTitle>
            <Link
              href={`/group/${groupId}/expenses/debts`}
              className="text-primary text-sm hover:underline"
            >
              View details
              <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!hasBalances ? (
            <div className="flex items-center gap-3 py-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground text-sm">
                All settled up! No outstanding balances.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {currencies.map((currency) => {
                const balance = memberBalances[currency] ?? 0;
                const formattedAmount = formatCurrencyFromCents({
                  cents: Math.abs(balance),
                  currency,
                });
                const isPositive = balance > 0;
                const isZero = balance === 0;

                if (isZero) return null;

                return (
                  <div
                    key={currency}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={`text-sm ${
                        isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isPositive ? "You are owed" : "You owe"}
                    </span>
                    <span
                      className={`text-lg font-semibold ${
                        isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formattedAmount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link href={`/group/${groupId}/expenses`}>
          Go to expenses
          <ArrowRight className="ml-1 inline h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
