"use client";

import type { AddToShoppingListResult } from "@flatsby/validators/chat";
import { AlertCircle, CheckCircle, ShoppingCart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

interface ShoppingListToolCardProps {
  result: AddToShoppingListResult;
}

export function ShoppingListToolCard({ result }: ShoppingListToolCardProps) {
  if (!result.success && result.addedItems.length === 0) {
    // Error state - no items were added
    return (
      <Card className="my-2 max-w-sm border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="size-4" />
            Failed to add items
          </CardTitle>
        </CardHeader>
        {result.failedItems && result.failedItems.length > 0 && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
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
      <CardContent className="pt-0">
        <ul className="space-y-1">
          {result.addedItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <CheckCircle className="size-3.5 text-green-500" />
              <span>{item.name}</span>
              <span className="text-xs text-muted-foreground">
                ({item.categoryId})
              </span>
            </li>
          ))}
        </ul>
        {result.failedItems && result.failedItems.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="size-3" />
            {result.failedItems.length} item(s) could not be added
          </div>
        )}
      </CardContent>
    </Card>
  );
}
