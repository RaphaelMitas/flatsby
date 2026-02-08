"use client";

import type { SearchDataOutput } from "@flatsby/validators/chat/tools";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  List,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { OptimisticShoppingListItem } from "~/app/shopping-list/[shoppingListId]/ShoppingListItem";

interface SearchDataResultProps {
  output: SearchDataOutput;
}

export function SearchDataResult({ output }: SearchDataResultProps) {
  if (!output.success) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm">
        <AlertCircle className="text-destructive size-4" />
        <span className="text-destructive">{output.error}</span>
      </div>
    );
  }

  const { data, metadata } = output;

  switch (data.type) {
    case "shoppingLists":
      return (
        <Card className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <List className="size-4" />
              Shopping Lists
              <span className="text-muted-foreground font-normal">
                ({metadata.count} lists)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {data.items.map((list) => (
                <li key={list.id}>
                  <Link
                    href={`/shopping-list/${list.id}`}
                    className="hover:bg-muted flex items-center justify-between rounded-md p-2 transition-colors"
                  >
                    <span className="font-medium">{list.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {list.uncheckedItemCount} items
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );

    case "shoppingListItems":
      return (
        <Card className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <List className="size-4" />
              {data.listName}
              <span className="text-muted-foreground font-normal">
                ({metadata.count} items)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto pt-0">
            {data.items.map((item) => (
              <OptimisticShoppingListItem
                key={item.id}
                id={item.id}
                name={item.name}
                completed={item.completed}
                categoryId={item.categoryId}
                showCheckbox={false}
                showActions={false}
              />
            ))}
          </CardContent>
        </Card>
      );

    case "expenses":
      return (
        <Card className="my-2 max-w-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="size-4" />
              Recent Expenses
              <span className="text-muted-foreground font-normal">
                ({metadata.count} expenses)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto pt-0">
            {data.items.map((expense) => (
              <div
                key={expense.id}
                className="border-border rounded-md border p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {expense.description ?? "Expense"}
                  </span>
                  <span className="font-medium">
                    {formatCurrencyFromCents({
                      cents: expense.amountInCents,
                      currency: expense.currency,
                    })}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  Paid by {expense.paidByMemberName}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      );

    case "groupMembers":
      return (
        <Card className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" />
              Group Members
              <span className="text-muted-foreground font-normal">
                ({metadata.count} members)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {data.items.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="size-6 rounded-full"
                      />
                    ) : (
                      <div className="bg-muted flex size-6 items-center justify-center rounded-full">
                        <span className="text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium">
                      {member.name}
                      {member.isCurrentUser && (
                        <span className="text-muted-foreground ml-1 text-sm">
                          (you)
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-sm capitalize">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );

    case "debts":
      return (
        <Card className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="size-4" />
              Debts in {metadata.groupName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.length === 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                All settled up!
              </div>
            ) : (
              <ul className="space-y-1">
                {data.items.map((debt, i) => (
                  <li key={i} className="flex items-center gap-1 text-sm">
                    <span className="font-medium">{debt.fromMemberName}</span>
                    <ArrowRight className="text-muted-foreground size-3" />
                    <span className="font-medium">{debt.toMemberName}</span>
                    <span className="ml-auto">
                      {formatCurrencyFromCents({
                        cents: debt.amountInCents,
                        currency: debt.currency,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      );

    case "groups":
      return (
        <Card className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" />
              Group Info
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="font-medium">{group.name}</div>
                <div className="text-muted-foreground text-sm">
                  {group.memberCount} members
                  {group.isCurrentUserAdmin && " (you're admin)"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      );
  }
}
