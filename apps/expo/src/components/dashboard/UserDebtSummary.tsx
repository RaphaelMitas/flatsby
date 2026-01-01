import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";

interface UserDebtSummaryProps {
  groupId: number;
}

function UserDebtSummaryInner({ groupId }: UserDebtSummaryProps) {
  const router = useRouter();

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
    return handleApiError({ router, error: groupData.error });
  }

  const currentGroupMemberId = groupData.data.thisGroupMember.id;

  if (!debtData.success) {
    return handleApiError({ router, error: debtData.error });
  }

  const memberBalances =
    debtData.data.memberBalances[currentGroupMemberId] ?? {};
  const currencies = Object.keys(memberBalances);
  const hasBalances = currencies.some((currency) =>
    debtData.data.currencies[currency]
      ? debtData.data.currencies[currency].debts.length > 0
      : false,
  );

  return (
    <View className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <View className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Your Balance
            </CardTitle>
            <Link href="/(tabs)/expenses/debts">
              <Text className="text-primary text-sm">View details</Text>
            </Link>
          </View>
        </CardHeader>
        <CardContent>
          {!hasBalances ? (
            <View className="flex flex-row items-center gap-3 py-2">
              <Icon name="circle-check" size={20} color="success" />
              <Text className="text-muted-foreground text-sm">
                All settled up! No outstanding balances.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
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
                  <View
                    key={currency}
                    className="flex flex-row items-center justify-between"
                  >
                    <Text
                      className={`text-sm ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "You are owed" : "You owe"}
                    </Text>
                    <Text
                      className={`text-lg font-semibold ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formattedAmount}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <Button
            title="Go to expenses"
            icon="arrow-right"
            onPress={() => router.push("/(tabs)/expenses")}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </View>
  );
}

export function UserDebtSummary({ groupId }: UserDebtSummaryProps) {
  return (
    <Suspense
      fallback={
        <View className="flex items-center justify-center py-4">
          <ActivityIndicator size="small" />
        </View>
      }
    >
      <UserDebtSummaryInner groupId={groupId} />
    </Suspense>
  );
}
