import { ExpensesDashboard } from "~/components/expenses/ExpensesDashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function ExpensesIndex() {
  return (
    <SafeAreaView>
      <ExpensesDashboard />
    </SafeAreaView>
  );
}
