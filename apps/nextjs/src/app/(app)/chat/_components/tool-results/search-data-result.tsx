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
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { isPlaceholder } from "@flatsby/validators/group";

import { ShoppingListItemDisplay } from "~/app/_components/ShoppingListItemDisplay";

interface SearchDataResultProps {
  output: SearchDataOutput;
}

export function SearchDataResult({ output }: SearchDataResultProps) {
  const t = useTranslations("chat.toolResults");
  const locale = useLocale();

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
              {t("search.shoppingLists")}
              <span className="text-muted-foreground font-normal">
                {t("search.listCount", { count: metadata.count })}
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
                      {t("search.itemCount", {
                        count: list.uncheckedItemCount,
                      })}
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
                {t("search.itemCountParens", { count: metadata.count })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto pt-0">
            {data.items.map((item) => (
              <ShoppingListItemDisplay
                key={item.id}
                name={item.name}
                completed={item.completed}
                categoryId={item.categoryId}
                showCheckbox={false}
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
              {t("search.recentExpenses")}
              <span className="text-muted-foreground font-normal">
                {t("search.expenseCount", { count: metadata.count })}
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
                    {expense.description ?? t("expenseFallback")}
                  </span>
                  <span className="font-medium">
                    {formatCurrencyFromCents({
                      cents: expense.amountInCents,
                      currency: expense.currency,
                      locale,
                    })}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {t("paidBy", { name: expense.paidByMemberName })}
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
              {t("search.groupMembers")}
              <span className="text-muted-foreground font-normal">
                {t("search.memberCountParens", { count: metadata.count })}
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
                    <UserAvatar
                      name={member.name}
                      image={member.image}
                      placeholder={isPlaceholder(member)}
                      size="sm"
                    />
                    <span className="font-medium">
                      {member.name}
                      {member.isCurrentUser && (
                        <span className="text-muted-foreground ml-1 text-sm">
                          {t("search.you")}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-sm capitalize">
                    {t(`search.role.${member.role}`)}
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
              {t("search.debtsIn", { group: metadata.groupName })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.length === 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                {t("search.settledUp")}
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
                        locale,
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
              {t("search.groupInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="font-medium">{group.name}</div>
                <div className="text-muted-foreground text-sm">
                  {t("search.memberCount", { count: group.memberCount })}
                  {group.isCurrentUserAdmin && ` ${t("search.youreAdmin")}`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      );
  }
}
