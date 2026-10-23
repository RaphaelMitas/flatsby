import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { ExpenseListPanel } from "~/components/expenses/ExpenseListPanel";
import { useMediaQuery } from "~/components/splitview/useMediaQuery";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useShoppingStore } from "~/utils/shopping-store";

export default function ExpensesIndex() {
  const router = useRouter();
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const isLargeScreen = useMediaQuery("md");

  if (!selectedGroupId) {
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center gap-4 p-4">
          <Icon name="wallet" size={48} color="muted-foreground" />
          <Text className="text-muted-foreground text-center text-lg font-semibold">
            {t("expenses.selectGroupHint")}
          </Text>
          <Button
            title={t("navigation.manageGroups")}
            variant="primary"
            size="lg"
            icon="arrow-left-right"
            onPress={() => router.push("/(tabs)/home")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // The layout renders the list beside this stack on large screens
  if (isLargeScreen) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Icon name="receipt" size={64} color="muted-foreground" />
        <View className="items-center gap-2">
          <Text className="text-foreground text-lg font-semibold">
            {t("expenses.selectExpense")}
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            {t("expenses.selectExpenseHint")}
          </Text>
        </View>
      </View>
    );
  }

  return <ExpenseListPanel />;
}
