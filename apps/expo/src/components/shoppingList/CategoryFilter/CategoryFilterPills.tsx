import type { CategoryId } from "@flatsby/validators/categories";
import { ScrollView } from "react-native";

import { categoryIds } from "@flatsby/validators/categories";

import { Badge } from "~/lib/ui/badge";
import { CategoryBadge } from "~/lib/ui/category-badge";

interface CategoryFilterPillsProps {
  counts: Record<string, number | undefined>;
  total: number | undefined;
  selectedCategory: CategoryId | null;
  onSelectCategory: (categoryId: CategoryId | null) => void;
}

export function CategoryFilterPills({
  counts,
  total,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterPillsProps) {
  if (total === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-2"
    >
      {/* All button - keep as custom since it's not a category */}
      <Badge
        variant={selectedCategory ? "outline" : "default"}
        onPress={() => onSelectCategory(null)}
        label="All"
        size="xl"
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
  );
}
