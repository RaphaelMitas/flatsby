import type { CategoryId } from "@flatsby/validators/categories";
import { ScrollView } from "react-native";
import { useTranslations } from "use-intl";

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
  const t = useTranslations("shoppingList.filter");
  if (total === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-2"
      keyboardShouldPersistTaps="handled"
    >
      {/* All button - keep as custom since it's not a category */}
      <Badge
        testID="category-filter-all"
        variant={selectedCategory ? "outline" : "default"}
        onPress={() => onSelectCategory(null)}
        label={t("all")}
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
            testID={`category-filter-${categoryId}`}
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
