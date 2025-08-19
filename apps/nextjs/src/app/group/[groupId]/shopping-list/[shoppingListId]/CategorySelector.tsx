import { ChevronDown } from "lucide-react";

import type { CategoryIdWithAiAutoSelect } from "@flatsby/ui/categories";
import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { categories, getCategoryColorClasses } from "@flatsby/ui/categories";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flatsby/ui/sheet";

interface CategorySelectorProps {
  value?: CategoryIdWithAiAutoSelect;
  onChange?: (value: CategoryIdWithAiAutoSelect) => void;
  iconButton?: boolean;
}

export function CategorySelector({
  iconButton = false,
  value,
  onChange,
}: CategorySelectorProps) {
  const selectedCategory =
    categories.find((c) => c.id === value) ?? categories[0];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={false}
          className={cn(
            "flex items-center justify-between",
            iconButton && "h-10 w-10 justify-center",
          )}
        >
          <span className="flex items-center">
            {selectedCategory?.icon && (
              <selectedCategory.icon
                className={cn(
                  "h-5 w-5",
                  getCategoryColorClasses(selectedCategory.id).base,
                  !iconButton && "mr-2",
                )}
              />
            )}
            {!iconButton && (
              <span className="text-foreground">{selectedCategory?.name}</span>
            )}
          </span>
          {!iconButton && (
            <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Select Category</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(80vh-6rem)]">
          {categories.map((category) => (
            <SheetClose asChild key={category.id} className="h-full">
              <Button
                variant="ghost"
                onClick={() => onChange?.(category.id)}
                className={cn(
                  "flex w-full items-center justify-start gap-4 px-4 py-3",
                  selectedCategory?.id === category.id && "bg-muted",
                )}
              >
                <category.icon
                  className={cn(
                    "h-6 w-6",
                    getCategoryColorClasses(category.id).base,
                  )}
                />
                <div className="flex flex-col text-left">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {category.description}
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
