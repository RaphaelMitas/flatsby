"use client";

import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import { Calendar, Edit, Trash2, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Separator } from "@flatsby/ui/separator";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

interface ExpenseDetailContentProps {
  expense: ExpenseWithSplitsAndMembers;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ExpenseDetailContent({
  expense,
  onEdit,
  onDelete,
  isDeleting,
}: ExpenseDetailContentProps) {
  const formattedAmount = formatCurrencyFromCents({
    cents: expense.amountInCents,
    currency: expense.currency,
  });
  const expenseDate = new Date(expense.expenseDate);
  const formattedDate = expenseDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Action buttons */}
      {(onEdit ?? onDelete) && (
        <div className="flex justify-end gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit} disabled={isDeleting}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Main expense card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{formattedAmount}</CardTitle>
              {expense.description && (
                <CardDescription className="mt-2 text-base">
                  {expense.description}
                </CardDescription>
              )}
            </div>
            {expense.splitMethod === "settlement" && (
              <span className="bg-muted-foreground/20 text-muted-foreground rounded px-3 py-1 text-xs">
                Settlement
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {expense.splitMethod === "settlement" && expense.expenseSplits[0] && (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  alt={expense.expenseSplits[0].groupMember.user.name}
                  src={
                    expense.expenseSplits[0].groupMember.user.image ?? undefined
                  }
                />
                <AvatarFallback>
                  {expense.expenseSplits[0].groupMember.user.name
                    .substring(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-muted-foreground text-sm">From</p>
                <p className="font-semibold">
                  {expense.expenseSplits[0].groupMember.user.name}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                alt={expense.paidByGroupMember.user.name}
                src={expense.paidByGroupMember.user.image ?? undefined}
              />
              <AvatarFallback>
                {expense.paidByGroupMember.user.name
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm">
                {expense.splitMethod === "settlement" ? "To" : "Paid by"}
              </p>
              <p className="font-semibold">
                {expense.paidByGroupMember.user.name}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm">Date</p>
              <p className="font-semibold">{formattedDate}</p>
            </div>
          </div>

          {expense.category && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm">Category</p>
                <p className="font-semibold capitalize">{expense.category}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Split details card */}
      {expense.splitMethod !== "settlement" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Split Details
            </CardTitle>
            <CardDescription>
              {`Split between ${expense.expenseSplits.length} ${expense.expenseSplits.length === 1 ? "person" : "people"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expense.expenseSplits.map((split, index) => {
                const member = split.groupMember;
                const splitAmount = formatCurrencyFromCents({
                  cents: split.amountInCents,
                  currency: expense.currency,
                });
                const percentage =
                  (split.amountInCents / expense.amountInCents) * 100;

                return (
                  <div key={split.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            alt={member.user.name}
                            src={member.user.image ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {member.user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{splitAmount}</p>
                    </div>
                    {index < expense.expenseSplits.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created by card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                alt={expense.createdByGroupMember.user.name}
                src={expense.createdByGroupMember.user.image ?? undefined}
              />
              <AvatarFallback className="text-xs">
                {expense.createdByGroupMember.user.name
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm">Created by</p>
              <p className="text-sm font-medium">
                {expense.createdByGroupMember.user.name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
