import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { GroupGate } from "~/components/GroupGate";

export default function CreateExpense() {
  return <GroupGate>{(group) => <ExpenseForm group={group} />}</GroupGate>;
}
