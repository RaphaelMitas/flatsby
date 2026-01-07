"use client";

import type { ShoppingListInfo } from "@flatsby/validators/chat";
import { List, ShoppingCart } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

interface ShoppingListSelectorProps {
  lists: ShoppingListInfo[];
  onSelect: (list: ShoppingListInfo) => void;
  disabled?: boolean;
}

export function ShoppingListSelector({
  lists,
  onSelect,
  disabled,
}: ShoppingListSelectorProps) {
  if (lists.length === 0) {
    return (
      <Card className="my-2 max-w-sm">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            No shopping lists found. Create one first!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2 max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <List className="size-4" />
          Select a shopping list
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 pt-0">
        {lists.map((list) => (
          <Button
            key={list.id}
            variant="outline"
            className="h-auto justify-start gap-3 px-3 py-2"
            onClick={() => onSelect(list)}
            disabled={disabled}
          >
            <ShoppingCart className="size-4 shrink-0" />
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{list.name}</span>
              <span className="text-xs text-muted-foreground">
                {list.groupName}
                {list.uncheckedItemLength > 0 &&
                  ` · ${list.uncheckedItemLength} item${list.uncheckedItemLength === 1 ? "" : "s"}`}
              </span>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
