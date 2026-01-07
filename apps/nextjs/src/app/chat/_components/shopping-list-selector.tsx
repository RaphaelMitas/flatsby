"use client";

import type { ShoppingListInfo } from "@flatsby/validators/chat";
import { ShoppingCart } from "lucide-react";

import { Button } from "@flatsby/ui/button";

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
      <p className="my-2 text-sm text-muted-foreground">
        No shopping lists found. Create one first!
      </p>
    );
  }

  return (
    <div className="my-2 flex flex-wrap gap-2">
      {lists.map((list) => (
        <Button
          key={list.id}
          variant="outline"
          size="sm"
          className="h-auto gap-1.5 px-3 py-1.5"
          onClick={() => onSelect(list)}
          disabled={disabled}
        >
          <ShoppingCart className="size-3.5" />
          <span>{list.name}</span>
          {list.uncheckedItemLength > 0 && (
            <span className="text-muted-foreground">
              ({list.uncheckedItemLength})
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
