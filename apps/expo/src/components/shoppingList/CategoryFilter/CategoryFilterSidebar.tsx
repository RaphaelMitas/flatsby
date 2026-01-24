import type { CategoryId } from "@flatsby/validators/categories";
import { ScrollView, View } from "react-native";

import { categoryIds } from "@flatsby/validators/categories";

import { Badge } from "~/lib/ui/badge";
import { CategoryBadge } from "~/lib/ui/category-badge";

interface CategoryFilterSidebarProps {
  counts: Record<string, number | undefined>;
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
  if (total === 0) {
    return null;
  }

  return (
    <View className="border-border h-full w-56 border-r">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-1 p-4"
      >
        <Badge
          size="xl"
          onPress={() => onSelectCategory(null)}
          label="All Items"
          variant={selectedCategory ? "outline" : "default"}
          count={total && total > 0 ? total : undefined}
        />

        {/* Category buttons using CategoryBadge */}
        {categoryIds.map((categoryId) => {
          const count = counts[categoryId] ?? 0;
          const isSelected = selectedCategory === categoryId;

          return (
            <CategoryBadge
              key={categoryId}
              categoryId={categoryId}
              size="xl"
              variant={isSelected ? "default" : "outline"}
              onPress={() => onSelectCategory(categoryId)}
              count={count > 0 ? count : undefined}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
