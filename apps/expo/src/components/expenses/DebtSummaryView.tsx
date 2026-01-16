import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type { GroupDebtSummary } from "@flatsby/validators/expenses/types";
import { useCallback, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

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

interface DebtSummaryViewProps {
  groupId: number;
}

export function DebtSummaryView({ groupId }: DebtSummaryViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Get debt summary
  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  // Get group members for display
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: trpc.expense.getDebtSummary.queryKey({ groupId }),
    });
    setRefreshing(false);
  }, [queryClient, groupId]);

  if (!debtData.success) {
    return handleApiError({ router, error: debtData.error });
  }

  if (!groupData.success) {
    return handleApiError({ router, error: groupData.error });
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

  const getMemberImage = (memberId: number): string => {
    return memberMap.get(memberId)?.user.image ?? "";
  };

  const hasAnyDebts = currencies.some((currency) =>
    debtSummary.currencies[currency]
      ? debtSummary.currencies[currency].debts.length > 0
      : false,
  );

  return (
    <AppScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="flex w-full flex-col gap-4 p-4">
        <View className="flex flex-row items-center justify-between">
          <View>
            <Text className="text-foreground text-2xl font-bold tracking-tight">
              Debt Summary
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              Simplified view of who owes whom
            </Text>
          </View>
          <Button
            title="Add expenses"
            size="md"
            icon="arrow-right"
            onPress={() => router.push("/(tabs)/expenses")}
            className="mt-4"
          />
        </View>

        {!hasAnyDebts ? (
          <Card>
            <CardContent className="pt-6">
              <View className="flex flex-row items-center justify-center gap-4 py-8">
                <Icon name="circle-check" size={48} color="success" />
                <View>
                  <Text className="text-foreground text-lg font-semibold">
                    All settled up!
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    No outstanding debts in this group
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-6">
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
                    <View className="gap-3">
                      {currencyDebts.debts.map((debt, index) => {
                        const formattedAmount = formatCurrencyFromCents({
                          cents: debt.amountInCents,
                          currency,
                        });

                        return (
                          <View
                            key={`${debt.fromGroupMemberId}-${debt.toGroupMemberId}-${index}`}
                          >
                            <View className="flex-col items-center justify-between gap-2 p-2">
                              <View className="flex min-w-0 flex-1 flex-row items-center gap-2">
                                <View className="flex-row gap-2">
                                  <Avatar className="mr-4 h-4 w-4">
                                    <AvatarImage
                                      src={getMemberImage(
                                        debt.fromGroupMemberId,
                                      )}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {getMemberName(debt.fromGroupMemberId)
                                        .substring(0, 1)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Text
                                    className="text-destructive shrink-0 text-sm font-medium"
                                    numberOfLines={1}
                                  >
                                    {getMemberName(debt.fromGroupMemberId)}
                                  </Text>
                                </View>
                                <Icon
                                  name="arrow-right"
                                  size={16}
                                  color="muted-foreground"
                                  className="flex-1 text-center"
                                />
                                <View className="flex-row items-center gap-2">
                                  <Avatar className="mr-4 h-4 w-4">
                                    <AvatarImage
                                      src={getMemberImage(debt.toGroupMemberId)}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {getMemberName(debt.toGroupMemberId)
                                        .substring(0, 1)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Text
                                    className="text-success shrink-0 text-sm font-medium"
                                    numberOfLines={1}
                                  >
                                    {getMemberName(debt.toGroupMemberId)}
                                  </Text>
                                </View>
                              </View>
                              <View className="flex-row items-center gap-3">
                                <Text className="text-foreground flex-1 text-lg font-semibold">
                                  {formattedAmount}
                                </Text>
                                <Button
                                  title="Settle Up"
                                  size="sm"
                                  variant="outline"
                                  onPress={() =>
                                    router.push({
                                      pathname: "/(tabs)/expenses/settle",
                                      params: {
                                        fromGroupMemberId:
                                          debt.fromGroupMemberId.toString(),
                                        toGroupMemberId:
                                          debt.toGroupMemberId.toString(),
                                        currency,
                                        amount: debt.amountInCents.toString(),
                                      },
                                    })
                                  }
                                />
                              </View>
                            </View>
                            {index < currencyDebts.debts.length - 1 && (
                              <Separator className="mt-3" />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </CardContent>
                </Card>
              );
            })}
            <Button
              title="Settle Up"
              onPress={() => router.push("/(tabs)/expenses/settle")}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Member Balances</CardTitle>
                <CardDescription>
                  Net balance for each member by currency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-4">
                  {groupMembers.map((member) => {
                    const balances =
                      debtSummary.memberBalances[member.id] ?? {};
                    const hasBalances = Object.keys(balances).length > 0;

                    if (!hasBalances) return null;

                    return (
                      <View key={member.id}>
                        <View className="mb-2 flex-row items-center gap-2">
                          <Avatar className="mr-4 h-6 w-6">
                            <AvatarImage src={member.user.image ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {member.user.name.substring(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Text className="text-foreground font-medium">
                            {member.user.name}
                          </Text>
                        </View>
                        <View className="ml-4 gap-1">
                          {Object.entries(balances).map(
                            ([currency, balance]) => {
                              const formattedBalance = formatCurrencyFromCents({
                                cents: balance,
                                currency,
                              });
                              const isPositive = balance > 0;
                              const isZero = balance === 0;

                              return (
                                <View
                                  key={currency}
                                  className="flex-row items-center justify-between"
                                >
                                  <Text className="text-muted-foreground text-sm">
                                    {currency}:
                                  </Text>
                                  <Text
                                    className={`text-sm font-semibold ${
                                      isZero
                                        ? "text-muted-foreground"
                                        : isPositive
                                          ? "text-green-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {isZero
                                      ? formattedBalance
                                      : isPositive
                                        ? `+${formattedBalance}`
                                        : formattedBalance}
                                  </Text>
                                </View>
                              );
                            },
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          </View>
        )}
      </View>
    </AppScrollView>
  );
}
