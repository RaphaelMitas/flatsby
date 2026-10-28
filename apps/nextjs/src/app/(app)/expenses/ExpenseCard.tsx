"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Handshake,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Badge } from "@flatsby/ui/badge";
import { Card } from "@flatsby/ui/card";
import { getExpenseCategoryData } from "@flatsby/ui/categories/expense-categories";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  formatExpenseAmounts,
  formatExpenseDateShort,
} from "@flatsby/validators/expenses/formatting";
import { isPlaceholder } from "@flatsby/validators/group";

interface ExpenseCardProps {
  expense: ExpenseWithSplitsAndMembers;
  isNotConverted?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ExpenseCard({
  expense,
  isNotConverted,
  isSelected,
  onSelect,
}: ExpenseCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const splitCount = expense.expenseSplits.length;
  const paidByName = expense.paidByGroupMember.user.name;
  const { amount, paid } = formatExpenseAmounts(expense, locale);
  const expenseDate = new Date(expense.expenseDate);
  const formattedDate = formatExpenseDateShort(expenseDate, locale);

  const settlementCounterparty =
    expense.splitMethod === "settlement" && expense.expenseSplits[0]
      ? expense.expenseSplits[0].groupMember
      : null;

  const categoryData = getExpenseCategoryData(expense.subcategory);

  const cardContent = (
    <Card
      className={cn(
        "bg-muted md:hover:bg-muted/80 cursor-pointer p-4 transition-colors",
        isSelected && "ring-primary ring-2",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Header: Amount and Currency */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold">{amount}</span>
                {expense.splitMethod === "settlement" ? (
                  <Badge variant="secondary" className="gap-1.5 rounded-full">
                    <Handshake size={14} />
                    {t("expenses.settlement")}
                  </Badge>
                ) : (
                  <Badge
                    className={cn(
                      "gap-1.5 rounded-full",
                      categoryData.colorClasses.bg,
                      categoryData.colorClasses.base,
                      categoryData.colorClasses.border,
                    )}
                  >
                    <categoryData.icon size={14} />
                    {t(categoryData.name)}
                  </Badge>
                )}
              </div>
              {(paid !== undefined || isNotConverted) && (
                <p
                  className="text-muted-foreground text-sm"
                  data-testid="expense-card-paid-amount"
                >
                  {paid ?? t("expenses.conversion.notConverted")}
                </p>
              )}
              {expense.description && (
                <p className="mt-1 line-clamp-2 text-lg font-medium">
                  {expense.description}
                </p>
              )}
            </div>
          </div>

          {/* Details: Paid by, Split info, Date */}
          <div className="text-muted-foreground flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              {settlementCounterparty && (
                <>
                  <UserAvatar
                    name={settlementCounterparty.user.name}
                    image={settlementCounterparty.user.image}
                    placeholder={isPlaceholder(settlementCounterparty)}
                    size="xs"
                  />
                  <span>{settlementCounterparty.user.name}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
              <UserAvatar
                name={paidByName}
                image={expense.paidByGroupMember.user.image}
                placeholder={isPlaceholder(expense.paidByGroupMember)}
                size="xs"
              />
              <span className="truncate">
                {expense.splitMethod === "settlement"
                  ? paidByName
                  : t("expenses.paidBy", { name: paidByName })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {expense.splitMethod !== "settlement" && (
                <>
                  <Users className="h-4 w-4" />
                  <span>
                    {t("expenses.splitBetween", { count: splitCount })}
                  </span>
                  <span>·</span>
                </>
              )}
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
      </div>
    </Card>
  );

  if (onSelect) {
    return (
      <button
        data-testid={`expense-card-${expense.id}`}
        type="button"
        onClick={onSelect}
        disabled={"isPending" in expense && expense.isPending === true}
        className="w-full text-left"
      >
        {cardContent}
      </button>
    );
  }

  return <Link href={`/expenses/${expense.id}`}>{cardContent}</Link>;
}
