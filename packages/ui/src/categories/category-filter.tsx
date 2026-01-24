"use client";

import type { CategoryId } from "@flatsby/validators/categories";

import { cn } from "..";
import { Badge } from "../badge";
import { Button } from "../button";
import { categoryMapping, getCategoryColorClasses } from "./categories";

interface CategoryFilterProps {
  counts: Record<string, number>;
  total: number | undefined;
  selectedCategory: CategoryId | null;
  onSelectCategory: (categoryId: CategoryId | null) => void;
}

export function CategoryFilter({
  counts,
  total,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const availableCategories = categoryMapping.filter(
    (category) => category.id !== "ai-auto-select",
  );

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2">
      {/* All button */}
      <Button
        variant={selectedCategory === null ? "primary" : "outline"}
        size="sm"
        onClick={() => onSelectCategory(null)}
        className="shrink-0 rounded-full"
      >
        All
        {total && total > 0 && (
          <Badge
            variant={selectedCategory === null ? "secondary" : "outline"}
            className={cn(
              "ml-1 px-1.5",
              selectedCategory === null &&
                "bg-primary-foreground/20 text-primary-foreground border-transparent",
            )}
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
            variant={isSelected ? "primary" : "outline"}
            size="sm"
            onClick={() => onSelectCategory(category.id as CategoryId)}
            className="shrink-0 rounded-full"
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isSelected ? "text-primary-foreground" : colorClasses.base,
              )}
            />
            {category.name}
            {count > 0 && (
              <Badge
                variant={isSelected ? "secondary" : "outline"}
                className={cn(
                  "ml-1 px-1.5",
                  isSelected &&
                    "bg-primary-foreground/20 text-primary-foreground border-transparent",
                )}
              >
                {count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
