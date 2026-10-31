"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import { ArrowLeftRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { getExpenseCategoryData } from "@flatsby/ui/categories/expense-categories";
import {
  amountTone,
  describeExpenseRow,
} from "@flatsby/validators/expenses/formatting";

interface ExpenseCardProps {
  expense: ExpenseWithSplitsAndMembers;
  meId: number;
  first: boolean;
  last: boolean;
  isNotConverted?: boolean;
  isSelected?: boolean;
  onSelect: () => void;
}

export function ExpenseCard({
  expense,
  meId,
  first,
  last,
  isNotConverted,
  isSelected,
  onSelect,
}: ExpenseCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const row = describeExpenseRow(expense, meId, t, locale);
  const category = getExpenseCategoryData(expense.subcategory);

  return (
    <button
      data-testid={`expense-card-${expense.id}`}
      type="button"
      onClick={onSelect}
      disabled={"isPending" in expense && expense.isPending === true}
      className={cn(
        "bg-card md:hover:bg-muted/50 flex min-h-14 w-full cursor-pointer items-center gap-3 border-t border-r border-l px-3 py-2.5 text-left transition-colors",
        first && "rounded-t-xl",
        last && "rounded-b-xl border-b",
        isSelected && "bg-muted md:hover:bg-muted",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          row.isSettlement ? "bg-muted" : category.colorClasses.bg,
        )}
      >
        {row.isSettlement ? (
          <ArrowLeftRight className="text-muted-foreground h-4 w-4" />
        ) : (
          <category.icon
            className={cn("h-4 w-4", category.colorClasses.base)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-medium">{row.title}</p>
        <p className="text-muted-foreground line-clamp-1 text-sm">
          {row.category && <span className="sr-only">{row.category}, </span>}
          {row.payer}
          {row.paid && (
            <>
              {" · "}
              <span data-testid="expense-card-paid-amount">{row.paid}</span>
            </>
          )}
          {isNotConverted && ` · ${t("expenses.conversion.notConverted")}`}
          {` · ${row.date}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "font-semibold",
            row.isSettlement && "text-muted-foreground",
          )}
        >
          {row.amount}
        </p>
        {row.balance && (
          <p className={cn("text-xs", amountTone(row.balance.cents))}>
            {row.balance.text}
          </p>
        )}
      </div>
    </button>
  );
}
