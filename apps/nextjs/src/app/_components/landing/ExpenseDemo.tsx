"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";

import { ExpenseCard } from "~/app/expenses/ExpenseCard";

const demoExpenses: ExpenseWithSplitsAndMembers[] = [
  {
    id: 1,
    groupId: 1,
    description: "Groceries",
    amountInCents: 4500,
    currency: "EUR",
    splitMethod: "equal",
    expenseDate: new Date("2025-01-28"),
    category: "groceries",
    paidByGroupMemberId: 1,
    createdByGroupMemberId: 1,
    createdAt: new Date("2025-01-28"),
    paidByGroupMember: {
      id: 1,
      groupId: 1,
      userId: "1",
      role: "admin",
      joinedOn: new Date("2025-01-01"),
      user: {
        email: "alex@example.com",
        name: "Alex",
        image: null,
      },
    },
    createdByGroupMember: {
      id: 1,
      groupId: 1,
      userId: "1",
      role: "admin",
      joinedOn: new Date("2025-01-01"),
      user: {
        email: "alex@example.com",
        name: "Alex",
        image: null,
      },
    },
    expenseSplits: [
      {
        id: 1,
        expenseId: 1,
        groupMemberId: 1,
        amountInCents: 1500,
        createdAt: new Date("2025-01-28"),
        percentage: null,
        groupMember: {
          id: 1,
          user: { email: "alex@example.com", name: "Alex", image: null },
        },
      },
      {
        id: 2,
        expenseId: 1,
        groupMemberId: 2,
        amountInCents: 1500,
        createdAt: new Date("2025-01-28"),
        percentage: null,
        groupMember: {
          id: 2,
          user: { email: "sam@example.com", name: "Sam", image: null },
        },
      },
      {
        id: 3,
        expenseId: 1,
        groupMemberId: 3,
        amountInCents: 1500,
        createdAt: new Date("2025-01-28"),
        percentage: null,
        groupMember: {
          id: 3,
          user: { email: "jo@example.com", name: "Jo", image: null },
        },
      },
    ],
  },
  {
    id: 2,
    groupId: 1,
    description: "Electricity Bill",
    amountInCents: 12000,
    currency: "EUR",
    splitMethod: "equal",
    expenseDate: new Date("2025-01-25"),
    category: "utilities",
    paidByGroupMemberId: 2,
    createdByGroupMemberId: 2,
    createdAt: new Date("2025-01-25"),
    paidByGroupMember: {
      id: 2,
      groupId: 1,
      userId: "2",
      role: "member",
      joinedOn: new Date("2025-01-01"),
      user: {
        email: "sam@example.com",
        name: "Sam",
        image: null,
      },
    },
    createdByGroupMember: {
      id: 2,
      groupId: 1,
      userId: "2",
      role: "member",
      joinedOn: new Date("2025-01-01"),
      user: {
        email: "sam@example.com",
        name: "Sam",
        image: null,
      },
    },
    expenseSplits: [
      {
        id: 4,
        expenseId: 2,
        groupMemberId: 1,
        amountInCents: 4000,
        createdAt: new Date("2025-01-25"),
        percentage: null,
        groupMember: {
          id: 1,
          user: { email: "alex@example.com", name: "Alex", image: null },
        },
      },
      {
        id: 5,
        expenseId: 2,
        groupMemberId: 2,
        amountInCents: 4000,
        createdAt: new Date("2025-01-25"),
        percentage: null,
        groupMember: {
          id: 2,
          user: { email: "sam@example.com", name: "Sam", image: null },
        },
      },
      {
        id: 6,
        expenseId: 2,
        groupMemberId: 3,
        amountInCents: 4000,
        createdAt: new Date("2025-01-25"),
        percentage: null,
        groupMember: {
          id: 3,
          user: { email: "jo@example.com", name: "Jo", image: null },
        },
      },
    ],
  },
];

export function ExpenseDemo() {
  return (
    <div className="flex flex-col gap-3">
      {demoExpenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onSelect={() => undefined}
        />
      ))}
    </div>
  );
}
