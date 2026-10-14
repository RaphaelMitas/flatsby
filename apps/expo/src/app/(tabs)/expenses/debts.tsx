import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { DebtSummaryView } from "~/components/expenses/DebtSummaryView";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useShoppingStore } from "~/utils/shopping-store";

export default function DebtsPage() {
  const { selectedGroupId } = useShoppingStore();
  const router = useRouter();
  const t = useTranslations();

  if (!selectedGroupId) {
    return (
      <SafeAreaView edges={[]}>
        <View className="flex-1 flex-col items-center justify-center gap-4 p-4">
          <Text className="text-muted-foreground text-center">
            {t("common.noGroupSelectedHint")}
          </Text>
          <Button
            title={t("debts.goToGroups")}
            onPress={() => router.push("/(tabs)/home")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]}>
      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">
              {t("debts.loadingSummary")}
            </Text>
          </View>
        }
      >
        <DebtSummaryView groupId={selectedGroupId} />
      </Suspense>
    </SafeAreaView>
  );
}
