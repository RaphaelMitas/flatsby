"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronRight, Users } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Card } from "@flatsby/ui/card";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

interface ExpenseCardProps {
  expense: ExpenseWithSplitsAndMembers;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ExpenseCard({
  expense,
  isSelected,
  onSelect,
}: ExpenseCardProps) {
  const splitCount = expense.expenseSplits.length;
  const paidByName = expense.paidByGroupMember.user.name;
  const formattedAmount = formatCurrencyFromCents({
    cents: expense.amountInCents,
    currency: expense.currency,
  });
  const expenseDate = new Date(expense.expenseDate);
  const formattedDate = expenseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      expenseDate.getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });

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
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{formattedAmount}</span>
                {expense.splitMethod === "settlement" && (
                  <span className="bg-muted-foreground/20 text-muted-foreground rounded px-2 py-1 text-xs">
                    Settlement
                  </span>
                )}
              </div>
              {expense.description && (
                <p className="mt-1 line-clamp-2 text-sm font-medium">
                  {expense.description}
                </p>
              )}
            </div>
          </div>

          {/* Details: Paid by, Split info, Date */}
          <div className="text-muted-foreground flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              {expense.splitMethod === "settlement" &&
                expense.expenseSplits[0] &&
                (() => {
                  const groupMember = expense.expenseSplits[0].groupMember;
                  return (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          alt={groupMember.user.name}
                          src={groupMember.user.image ?? undefined}
                        />
                        <AvatarFallback className="text-xs">
                          {groupMember.user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{groupMember.user.name}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  );
                })()}
              <Avatar className="h-5 w-5">
                <AvatarImage
                  alt={paidByName}
                  src={expense.paidByGroupMember.user.image ?? undefined}
                />
                <AvatarFallback className="text-xs">
                  {paidByName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {`${expense.splitMethod === "settlement" ? "" : "Paid by "}${paidByName}`}
              </span>
            </div>

            {expense.splitMethod !== "settlement" && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  Split between {splitCount}{" "}
                  {splitCount === 1 ? "person" : "people"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
              {expense.category && (
                <>
                  <span>•</span>
                  <span className="capitalize">{expense.category}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground h-5 w-5 flex-shrink-0" />
      </div>
    </Card>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="w-full text-left">
        {cardContent}
      </button>
    );
  }

  return <Link href={`/expenses/${expense.id}`}>{cardContent}</Link>;
}
