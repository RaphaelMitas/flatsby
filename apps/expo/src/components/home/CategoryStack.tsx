import type { CategoryId } from "@flatsby/validators/categories";
import { View } from "react-native";

import { topCategories } from "@flatsby/validators/categories";

import { getCategoryData } from "~/components/shoppingList/ShoppingListCategory";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";

const MAX_CATEGORIES = 4;

export function CategoryStack({
  counts,
}: {
  counts: Partial<Record<CategoryId, number>>;
}) {
  return (
    <View className="flex-row">
      {topCategories(counts, MAX_CATEGORIES).map((categoryId, index) => {
        const { bgColor, color, iconName } = getCategoryData({ categoryId });
        return (
          <View
            key={categoryId}
            className={cn("bg-card rounded-full p-0.5", index > 0 && "-ml-2")}
          >
            <View
              className={cn(
                "h-8 w-8 items-center justify-center rounded-full",
                bgColor,
              )}
            >
              <Icon name={iconName} size={16} className={color} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
