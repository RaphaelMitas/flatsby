import { View } from "react-native";

import { ExpensesDashboard } from "~/components/expenses/ExpensesDashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function ExpensesIndex() {
  return (
    <SafeAreaView>
      <View className="h-full w-full">
        <ExpensesDashboard />
      </View>
    </SafeAreaView>
  );
}
