import { useLocalSearchParams } from "expo-router";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { GroupGate } from "~/components/GroupGate";

export default function CreateExpense() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  return (
    <GroupGate>
      {(group) => (
        <ExpenseForm group={group} closeOnSubmit autoFocus={focus === "1"} />
      )}
    </GroupGate>
  );
}
