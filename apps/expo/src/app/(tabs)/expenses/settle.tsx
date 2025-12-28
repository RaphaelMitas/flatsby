import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SettlementForm } from "~/components/expenses/SettlementForm";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function SettlePage() {
  const params = useLocalSearchParams<{
    fromGroupMemberId?: string;
    toGroupMemberId?: string;
    currency?: string;
    amount: string;
    expenseId?: string;
  }>();
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();

  const fromGroupMemberId = params.fromGroupMemberId
    ? parseInt(params.fromGroupMemberId)
    : undefined;
  const toGroupMemberId = params.toGroupMemberId
    ? parseInt(params.toGroupMemberId)
    : undefined;
  const currency = params.currency;
  const amount = params.amount ? parseInt(params.amount) : undefined;
  const expenseId = params.expenseId ? parseInt(params.expenseId) : undefined;

  if (!selectedGroupId) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: "Error" }} />
        <View className="h-full w-full flex-col items-center justify-center gap-4 p-4">
          <Text className="text-muted-foreground text-center">
            No group selected. Please select a group first.
          </Text>
          <Button
            title="Go to groups"
            onPress={() => router.push("/(tabs)/groups")}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerTitle: expenseId ? "Edit Settlement" : "Settle Up" }}
      />
      <Suspense
        fallback={
          <SafeAreaView>
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" />
              <Text className="text-muted-foreground mt-4">
                Loading settlement form...
              </Text>
            </View>
          </SafeAreaView>
        }
      >
        {expenseId ? (
          <SettlePageInnerEdit
            groupId={selectedGroupId}
            fromGroupMemberId={fromGroupMemberId}
            toGroupMemberId={toGroupMemberId}
            currency={currency}
            amount={amount}
            expenseId={expenseId}
            onClose={() => router.back()}
          />
        ) : (
          <SettlePageInner
            groupId={selectedGroupId}
            fromGroupMemberId={fromGroupMemberId}
            toGroupMemberId={toGroupMemberId}
            currency={currency}
            amount={amount}
            onClose={() => router.back()}
          />
        )}
      </Suspense>
    </>
  );
}

function SettlePageInnerEdit({
  groupId,
  fromGroupMemberId,
  toGroupMemberId,
  currency,
  amount,
  expenseId,
  onClose,
}: {
  groupId: number;
  fromGroupMemberId?: number;
  toGroupMemberId?: number;
  currency?: string;
  amount: number | undefined;
  expenseId: number;
  onClose: () => void;
}) {
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  const expense = expenseData.success ? expenseData.data : undefined;

  return (
    <SettlementForm
      groupId={groupId}
      fromGroupMemberId={fromGroupMemberId}
      toGroupMemberId={toGroupMemberId}
      currency={currency}
      amount={amount}
      expense={expense}
      onClose={onClose}
    />
  );
}

function SettlePageInner({
  groupId,
  fromGroupMemberId,
  toGroupMemberId,
  currency,
  amount: amount,
  onClose,
}: {
  groupId: number;
  fromGroupMemberId?: number;
  toGroupMemberId?: number;
  currency?: string;
  amount: number | undefined;
  onClose: () => void;
}) {
  return (
    <SettlementForm
      groupId={groupId}
      fromGroupMemberId={fromGroupMemberId}
      toGroupMemberId={toGroupMemberId}
      currency={currency}
      amount={amount}
      onClose={onClose}
    />
  );
}
