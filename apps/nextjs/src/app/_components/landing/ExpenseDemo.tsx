"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import { useTranslations } from "next-intl";

import { ExpenseCard } from "~/app/(app)/expenses/ExpenseCard";

type Member = ExpenseWithSplitsAndMembers["paidByGroupMember"];

function member(id: number, name: string, role: Member["role"]): Member {
  return {
    id,
    groupId: 1,
    userId: String(id),
    role,
    joinedOn: new Date("2025-01-01"),
    user: { email: `${name.toLowerCase()}@example.com`, name, image: null },
  };
}

const alex = member(1, "Alex", "admin");
const sam = member(2, "Sam", "member");
const members = [alex, sam, member(3, "Jo", "member")];

function demoExpense({
  id,
  description,
  amountInCents,
  date,
  category,
  subcategory,
  payer,
}: {
  id: number;
  description: string;
  amountInCents: number;
  date: string;
  category: ExpenseWithSplitsAndMembers["category"];
  subcategory: ExpenseWithSplitsAndMembers["subcategory"];
  payer: Member;
}): ExpenseWithSplitsAndMembers {
  const createdAt = new Date(date);
  return {
    id,
    groupId: 1,
    description,
    amountInCents,
    currency: "EUR",
    convertedAmountInCents: null,
    convertedCurrency: null,
    splitMethod: "equal",
    expenseDate: createdAt,
    category,
    subcategory,
    paidByGroupMemberId: payer.id,
    createdByGroupMemberId: payer.id,
    createdAt,
    paidByGroupMember: payer,
    createdByGroupMember: payer,
    expenseSplits: members.map((groupMember, index) => ({
      id: (id - 1) * members.length + index + 1,
      expenseId: id,
      groupMemberId: groupMember.id,
      amountInCents: amountInCents / members.length,
      createdAt,
      percentage: null,
      shares: null,
      groupMember,
    })),
  };
}

export function ExpenseDemo() {
  const t = useTranslations("marketing.demo");
  const demoExpenses = [
    demoExpense({
      id: 1,
      description: t("groceries"),
      amountInCents: 4500,
      date: "2025-01-28",
      category: "food-drinks",
      subcategory: "groceries",
      payer: alex,
    }),
    demoExpense({
      id: 2,
      description: t("electricity"),
      amountInCents: 12000,
      date: "2025-01-25",
      category: "utilities",
      subcategory: "electric",
      payer: sam,
    }),
  ];

  return (
    <div className="flex flex-col">
      {demoExpenses.map((expense, index) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          meId={alex.id}
          first={index === 0}
          last={index === demoExpenses.length - 1}
          onSelect={() => undefined}
        />
      ))}
    </div>
  );
}
