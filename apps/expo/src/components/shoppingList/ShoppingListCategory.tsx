import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import type {
  CategoryColorKey,
  CategoryColorVariant,
} from "@flatsby/validators/expenses/category-colors";
import type React from "react";
import { useMemo } from "react";
import { View } from "react-native";

import {
  categoryDescriptions,
  categoryNames,
  categorysIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import {
  categoryBgColorMap,
  categoryBorderColorMap,
  getCategoryTextColor,
} from "@flatsby/validators/expenses/category-colors";

import type {
  BottomSheetPickerItem,
  BottomSheetPickerTriggerProps,
} from "~/lib/ui/bottom-sheet-picker";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { BottomSheetPickerTrigger } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";

const iconSize = 20 as const;

interface CategoryConfig {
  colorKey: CategoryColorKey;
  iconName: IconProps["name"];
}

const CATEGORY_CONFIG: Record<CategoryIdWithAiAutoSelect, CategoryConfig> = {
  "ai-auto-select": {
    colorKey: "primary",
    iconName: "wand-sparkles",
  },
  produce: {
    colorKey: "green",
    iconName: "carrot",
  },
  "meat-seafood": {
    colorKey: "red",
    iconName: "beef",
  },
  dairy: {
    colorKey: "blue",
    iconName: "milk",
  },
  bakery: {
    colorKey: "orange",
    iconName: "cake-slice",
  },
  "frozen-foods": {
    colorKey: "cyan",
    iconName: "snowflake",
  },
  beverages: {
    colorKey: "purple",
    iconName: "cup-soda",
  },
  snacks: {
    colorKey: "yellow",
    iconName: "cookie",
  },
  pantry: {
    colorKey: "orange",
    iconName: "package",
  },
  "personal-care": {
    colorKey: "pink",
    iconName: "bath",
  },
  household: {
    colorKey: "gray",
    iconName: "house",
  },
  other: {
    colorKey: "zinc",
    iconName: "circle-off",
  },
};

export const getCategoryData = ({
  categoryId,
  colorVariant = "default",
}: {
  categoryId: CategoryIdWithAiAutoSelect;
  colorVariant?: CategoryColorVariant;
}) => {
  const config = CATEGORY_CONFIG[categoryId];
  const color = getCategoryTextColor(config.colorKey, colorVariant);
  const bgColor = categoryBgColorMap[config.colorKey];
  const borderColor = categoryBorderColorMap[config.colorKey];

  return {
    name: categoryNames[categoryId],
    color,
    bgColor,
    borderColor,
    colorKey: config.colorKey,
    icon: <Icon name={config.iconName} size={iconSize} className={color} />,
    description: categoryDescriptions[categoryId],
  };
};

export interface CategoryPickerProps extends Omit<
  BottomSheetPickerTriggerProps,
  "items" | "title"
> {
  value?: CategoryIdWithAiAutoSelect;
  onChange?: (value: CategoryIdWithAiAutoSelect) => void;
  excludeCategories?: CategoryIdWithAiAutoSelect[];
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  value,
  onChange,
  excludeCategories = [],
  triggerTitle,
  iconButton = false,
  ...props
}) => {
  const categoryItems = useMemo<BottomSheetPickerItem[]>(() => {
    return categorysIdWithAiAutoSelect
      .filter((categoryId) => !excludeCategories.includes(categoryId))
      .map((categoryId) => {
        const categoryData = getCategoryData({ categoryId });
        return {
          id: categoryId,
          title: categoryData.name,
          description: categoryData.description,
          icon: (
            <View className="flex items-center justify-center">
              {categoryData.icon}
            </View>
          ),
        };
      });
  }, [excludeCategories]);

  const handleSelect = (item: BottomSheetPickerItem) => {
    onChange?.(item.id as CategoryIdWithAiAutoSelect);
  };

  const selectedCategory = value
    ? getCategoryData({ categoryId: value })
    : null;
  const displayTitle =
    triggerTitle ?? selectedCategory?.name ?? "Select Category";

  return (
    <BottomSheetPickerTrigger
      items={categoryItems}
      selectedId={value}
      onSelect={handleSelect}
      triggerTitle={displayTitle}
      iconButton={iconButton}
      {...props}
    />
  );
};

CategoryPicker.displayName = "CategoryPicker";
