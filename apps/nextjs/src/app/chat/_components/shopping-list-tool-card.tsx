"use client";

import type { AddToShoppingListResult } from "@flatsby/validators/chat/tools";
import { AlertCircle, ShoppingCart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

import { OptimisticShoppingListItem } from "~/app/shopping-list/[shoppingListId]/ShoppingListItem";

interface ShoppingListToolCardProps {
  result: AddToShoppingListResult;
}

export function ShoppingListToolCard({ result }: ShoppingListToolCardProps) {
  if (!result.success && result.addedItems.length === 0) {
    // Error state - no items were added
    return (
      <Card className="border-destructive/50 bg-destructive/5 my-2 max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="size-4" />
            Failed to add items
          </CardTitle>
        </CardHeader>
        {result.failedItems && result.failedItems.length > 0 && (
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-xs">
              {result.failedItems[0]?.reason ?? "Unknown error"}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="my-2 max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ShoppingCart className="size-4" />
          Added to {result.shoppingListName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {result.addedItems.map((item) => (
          <OptimisticShoppingListItem
            key={item.id}
            id={item.id}
            name={item.name}
            completed={false}
            categoryId={item.categoryId}
            showCheckbox={false}
            showActions={false}
          />
        ))}
        {result.failedItems && result.failedItems.length > 0 && (
          <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
            <AlertCircle className="size-3" />
            {result.failedItems.length} item(s) could not be added
          </div>
        )}
      </CardContent>
    </Card>
  );
}
