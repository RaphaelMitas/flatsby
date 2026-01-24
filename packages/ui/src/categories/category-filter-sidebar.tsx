"use client";

import type { CategoryId } from "@flatsby/validators/categories";

import { cn } from "..";
import { Badge } from "../badge";
import { Button } from "../button";
import { ScrollArea } from "../scroll-area";
import { categoryMapping, getCategoryColorClasses } from "./categories";

interface CategoryFilterSidebarProps {
  counts: Record<string, number>;
  total: number | undefined;
  selectedCategory: CategoryId | null;
  onSelectCategory: (categoryId: CategoryId | null) => void;
}

export function CategoryFilterSidebar({
  counts,
  total,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterSidebarProps) {
  // Filter categories excluding ai-auto-select
  const availableCategories = categoryMapping.filter(
    (category) => category.id !== "ai-auto-select",
  );

  // Only hide when explicitly 0 items, not when loading (undefined)
  if (total === 0) {
    return null;
  }

  return (
    <div className="border-border h-full w-56 border-r">
      <ScrollArea className="h-full">
        <div className="space-y-1 p-4">
          {/* All Items button */}
          <Button
            variant={selectedCategory === null ? "primary" : "ghost"}
            size="sm"
            onClick={() => onSelectCategory(null)}
            className="w-full justify-between"
          >
            All Items
            {total && total > 0 && (
              <Badge
                variant={selectedCategory === null ? "secondary" : "outline"}
              >
                {total}
              </Badge>
            )}
          </Button>

          {/* Category buttons */}
          {availableCategories.map((category) => {
            const Icon = category.icon;
            const count = counts[category.id] ?? 0;
            const isSelected = selectedCategory === category.id;
            const colorClasses = getCategoryColorClasses(category.id);

            return (
              <Button
                key={category.id}
                variant={isSelected ? "primary" : "ghost"}
                size="sm"
                onClick={() => onSelectCategory(category.id as CategoryId)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "text-primary-foreground" : colorClasses.base,
                    )}
                  />
                  {category.name}
                </span>
                {count > 0 && (
                  <Badge variant={isSelected ? "secondary" : "outline"}>
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
