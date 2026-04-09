"use client";

import type { ExpenseSubcategoryIdWithAuto } from "@flatsby/validators/expenses/categories";
import { ChevronDown } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import {
  getAllExpenseCategoryItems,
  getExpenseCategoryData,
} from "@flatsby/ui/categories/expense-categories";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flatsby/ui/sheet";
import { AI_AUTO_DETECT } from "@flatsby/validators/expenses/categories";

interface ExpenseCategorySelectorProps {
  value?: ExpenseSubcategoryIdWithAuto;
  onChange?: (value: ExpenseSubcategoryIdWithAuto) => void;
  iconButton?: boolean;
  disabled?: boolean;
}

export function ExpenseCategorySelector({
  iconButton = false,
  value,
  onChange,
  disabled,
}: ExpenseCategorySelectorProps) {
  const selectedData = getExpenseCategoryData(value ?? AI_AUTO_DETECT);
  const allItems = getAllExpenseCategoryItems();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "flex items-center justify-between",
            iconButton && "h-10 w-10 justify-center p-0",
          )}
        >
          <span className="flex items-center">
            {selectedData && (
              <selectedData.icon
                className={cn(
                  "h-5 w-5",
                  selectedData.colorClasses.base,
                  !iconButton && "mr-2",
                )}
              />
            )}
            {!iconButton && (
              <span className="text-foreground">
                {selectedData?.name ?? "Select Category"}
              </span>
            )}
          </span>
          {!iconButton && (
            <ChevronDown className="text-muted-foreground ml-2 h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Select Category</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(80vh-6rem)]">
          {allItems.map((item) => (
            <SheetClose asChild key={item.id} className="h-full">
              <Button
                variant="ghost"
                onClick={() =>
                  onChange?.(item.id as ExpenseSubcategoryIdWithAuto)
                }
                className={cn(
                  "flex w-full items-center justify-start gap-4 px-4 py-3",
                  selectedData?.id === item.id && "bg-muted",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    item.colorClasses.bg,
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", item.colorClasses.base)}
                  />
                </div>
                <div className="flex flex-col text-left">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {item.description}
                  </div>
                </div>
              </Button>
            </SheetClose>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
