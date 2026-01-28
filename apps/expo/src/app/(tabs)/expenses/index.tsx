import { ExpensesSplitView } from "~/components/expenses/ExpensesSplitView";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function ExpensesIndex() {
  return (
    <SafeAreaView>
      <ExpensesSplitView />
    </SafeAreaView>
  );
}
