import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  useRoute,
  useRouter,
} from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { SettlementForm } from "~/components/expenses/SettlementForm";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function SettlePage() {
  const params = useLocalSearchParams<{
    fromGroupMemberId?: string;
    toGroupMemberId?: string;
    currency?: string;
    amount: string;
    expenseId?: string;
    source?: string;
  }>();
  const router = useRouter();
  const t = useTranslations();
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedGroupId } = useShoppingStore();
  // a save can resolve after the user left: never pop someone else's screen
  const close = () => {
    const stack = navigation.getState();
    const index = stack?.routes.findIndex(({ key }) => key === route.key) ?? -1;
    if (!stack || index < 0) return;
    if (index > 0) {
      navigation.dispatch({
        type: "GO_BACK",
        source: route.key,
        target: stack.key,
      });
    } else if (navigation.isFocused()) {
      router.back();
    }
  };

  const fromGroupMemberId = params.fromGroupMemberId
    ? parseInt(params.fromGroupMemberId, 10)
    : undefined;
  const toGroupMemberId = params.toGroupMemberId
    ? parseInt(params.toGroupMemberId, 10)
    : undefined;
  const currency = params.currency;
  const amount = params.amount ? parseInt(params.amount, 10) : undefined;
  const expenseId = params.expenseId
    ? parseInt(params.expenseId, 10)
    : undefined;
  const source =
    params.source === "direct" || params.source === "simplified"
      ? params.source
      : undefined;

  if (!selectedGroupId) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t("common.error") }} />
        <View className="h-full w-full flex-col items-center justify-center gap-4 p-4">
          <Text className="text-muted-foreground text-center">
            {t("common.noGroupSelectedHint")}
          </Text>
          <Button
            title={t("debts.goToGroups")}
            onPress={() => router.push("/(tabs)/home")}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: expenseId
            ? t("debts.editSettlement")
            : t("debts.settleUp"),
        }}
      />
      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">
              {t("debts.loadingSettlementForm")}
            </Text>
          </View>
        }
      >
        {expenseId ? (
          <SettlePageInnerEdit
            groupId={selectedGroupId}
            expenseId={expenseId}
            onClose={close}
          />
        ) : (
          <SettlementForm
            groupId={selectedGroupId}
            fromGroupMemberId={fromGroupMemberId}
            toGroupMemberId={toGroupMemberId}
            currency={currency}
            amount={amount}
            source={source}
            onClose={close}
          />
        )}
      </Suspense>
    </>
  );
}

function SettlePageInnerEdit({
  groupId,
  expenseId,
  onClose,
}: {
  groupId: number;
  expenseId: number;
  onClose: () => void;
}) {
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  return (
    <SettlementForm
      groupId={groupId}
      expense={expenseData.success ? expenseData.data : undefined}
      onClose={onClose}
    />
  );
}
