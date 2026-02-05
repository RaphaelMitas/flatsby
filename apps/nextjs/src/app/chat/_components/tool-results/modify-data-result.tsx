"use client";

import type { ModifyDataOutput } from "@flatsby/validators/chat/tools";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

interface ModifyDataResultProps {
  output: ModifyDataOutput;
}

export function ModifyDataResult({ output }: ModifyDataResultProps) {
  if (!output.success) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm">
        <AlertCircle className="text-destructive size-4" />
        <span className="text-destructive">{output.error}</span>
      </div>
    );
  }

  const ActionIcon = {
    create: Plus,
    update: Pencil,
    delete: Trash2,
  }[output.action];

  const actionLabel = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
  }[output.action];

  const entityLabel = {
    shoppingListItem: "item",
    expense: "expense",
    shoppingList: "shopping list",
    group: "group",
  }[output.entity];

  if (!output.result) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4 text-green-500" />
        <span>
          {actionLabel} {entityLabel}
        </span>
      </div>
    );
  }

  switch (output.entity) {
    case "shoppingListItem":
      return (
        <div className="my-2 flex items-center gap-2 text-sm">
          <ActionIcon
            className={`size-4 ${output.action === "delete" ? "text-red-500" : "text-green-500"}`}
          />
          <span>
            {actionLabel} "{output.result.name}"
            {output.action === "update" &&
              (output.result.completed ? " (checked off)" : " (unchecked)")}
          </span>
        </div>
      );

    case "expense":
      return (
        <Card className="my-2 max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ActionIcon
                className={`size-4 ${output.action === "delete" ? "text-red-500" : "text-green-500"}`}
              />
              {actionLabel} expense
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {output.result.description ?? "Expense"}
                </span>
                <span className="font-medium">
                  {formatCurrencyFromCents({
                    cents: output.result.amountInCents,
                    currency: output.result.currency,
                  })}
                </span>
              </div>
              <div className="text-muted-foreground text-sm">
                Paid by {output.result.paidByMemberName}
              </div>
              {output.result.splits.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-muted-foreground text-xs">
                    Split among:
                  </div>
                  {output.result.splits.map((split, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{split.memberName}</span>
                      <span>
                        {formatCurrencyFromCents({
                          cents: split.amountInCents,
                          currency: output.result.currency,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );

    case "shoppingList":
      return (
        <div className="my-2 flex items-center gap-2 text-sm">
          <ActionIcon
            className={`size-4 ${output.action === "delete" ? "text-red-500" : "text-green-500"}`}
          />
          <span>
            {actionLabel} shopping list{" "}
            {output.action !== "delete" ? (
              <Link
                href={`/shopping-list/${output.result.id}`}
                className="font-medium hover:underline"
              >
                "{output.result.name}"
              </Link>
            ) : (
              <span className="font-medium">"{output.result.name}"</span>
            )}
          </span>
        </div>
      );

    case "group":
      return (
        <div className="my-2 flex items-center gap-2 text-sm">
          <ActionIcon
            className={`size-4 ${output.action === "delete" ? "text-red-500" : "text-green-500"}`}
          />
          <span>
            {actionLabel} group "{output.result.name}"
          </span>
        </div>
      );
  }
}
