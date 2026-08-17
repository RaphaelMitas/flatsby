import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";

import { cn } from "@flatsby/ui";
import { getCategoryData } from "@flatsby/ui/categories";
import { Checkbox } from "@flatsby/ui/checkbox";

interface ShoppingListItemDisplayProps {
  name: string;
  completed: boolean;
  categoryId: CategoryIdWithAiAutoSelect | null;
  showCheckbox?: boolean;
}

export const ShoppingListItemDisplay = ({
  name,
  completed,
  categoryId,
  showCheckbox = true,
}: ShoppingListItemDisplayProps) => {
  const categoryData = categoryId ? getCategoryData(categoryId) : undefined;

  return (
    <div className="bg-muted flex w-full items-center rounded-lg pr-4">
      {showCheckbox && (
        <div className="-m-2 flex items-center justify-center p-6">
          <Checkbox
            checked={completed}
            disabled={true}
            className="disabled:opacity-100"
          />
        </div>
      )}
      <div
        className={cn("flex flex-1 justify-between gap-2 truncate p-3", {
          "pl-0": showCheckbox,
          "pr-0 pl-4": !showCheckbox,
        })}
      >
        <div
          className={cn(
            "flex-1 truncate text-left text-sm font-medium",
            completed && "text-muted-foreground line-through",
          )}
        >
          {name}
        </div>
        {categoryData && (
          <div
            className={cn(
              "line-clamp-2 flex items-center gap-2 text-xs",
              categoryData.colorClasses.base,
            )}
          >
            <categoryData.icon size={20} />
            <span>{categoryData.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
