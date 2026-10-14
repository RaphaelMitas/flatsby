"use client";

import type { ModifyDataOutput } from "@flatsby/validators/chat/tools";
import Link from "next/link";
import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

interface ModifyDataResultProps {
  output: ModifyDataOutput;
}

export function ModifyDataResult({ output }: ModifyDataResultProps) {
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

  const ActionIcon = {
    create: Plus,
    update: Pencil,
    delete: Trash2,
  }[output.action];

  switch (output.entity) {
    case "shoppingListItem":
      return (
        <div className="my-2 flex items-center gap-2 text-sm">
          <ActionIcon
            className={`size-4 ${output.action === "delete" ? "text-red-500" : "text-green-500"}`}
          />
          <span>
            {t(`modify.item.${output.action}`, { name: output.result.name })}
            {output.action === "update" &&
              ` ${t(output.result.completed ? "modify.checkedOff" : "modify.unchecked")}`}
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
              {t(`modify.expense.${output.action}`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {output.result.description ?? t("expenseFallback")}
                </span>
                <span className="font-medium">
                  {formatCurrencyFromCents({
                    cents: output.result.amountInCents,
                    currency: output.result.currency,
                    locale,
                  })}
                </span>
              </div>
              <div className="text-muted-foreground text-sm">
                {t("paidBy", { name: output.result.paidByMemberName })}
              </div>
              {output.result.splits.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-muted-foreground text-xs">
                    {t("modify.splitAmong")}
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
                          locale,
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
            {t.rich(`modify.shoppingList.${output.action}`, {
              listName: output.result.name,
              name: (chunks) =>
                output.action !== "delete" ? (
                  <Link
                    href={`/shopping-list/${output.result.id}`}
                    className="font-medium hover:underline"
                  >
                    {chunks}
                  </Link>
                ) : (
                  <span className="font-medium">{chunks}</span>
                ),
            })}
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
            {t(`modify.group.${output.action}`, { name: output.result.name })}
          </span>
        </div>
      );
  }
}
