import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import type {
  CategoryColorKey,
  CategoryColorVariant,
} from "@flatsby/validators/expenses/category-colors";
import type React from "react";
import { useMemo } from "react";
import { View } from "react-native";

import { categorysIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { getCategoryTextColor } from "@flatsby/validators/expenses/category-colors";

import type {
  BottomSheetPickerItem,
  BottomSheetPickerTriggerProps,
} from "~/lib/ui/bottom-sheet-picker";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { BottomSheetPickerTrigger } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";

const iconSize = 20 as const;

interface CategoryConfig {
  name: string;
  colorKey: CategoryColorKey;
  iconName: IconProps["name"];
  description: string;
}

const CATEGORY_CONFIG: Record<CategoryIdWithAiAutoSelect, CategoryConfig> = {
  "ai-auto-select": {
    name: "AI Auto Select",
    colorKey: "primary",
    iconName: "wand-sparkles",
    description: "AI will select the most appropriate category for the item",
  },
  produce: {
    name: "Produce",
    colorKey: "green",
    iconName: "carrot",
    description: "Fruits, vegetables, fresh herbs",
  },
  "meat-seafood": {
    name: "Meat & Fish",
    colorKey: "red",
    iconName: "beef",
    description: "Beef, chicken, pork, fish, seafood",
  },
  dairy: {
    name: "Dairy",
    colorKey: "blue",
    iconName: "milk",
    description: "Milk, cheese, yogurt, eggs",
  },
  bakery: {
    name: "Bakery",
    colorKey: "orange",
    iconName: "cake-slice",
    description: "Bread, cakes, pastries, muffins",
  },
  "frozen-foods": {
    name: "Frozen Foods",
    colorKey: "cyan",
    iconName: "snowflake",
    description: "Frozen dinners, pizza, ice cream",
  },
  beverages: {
    name: "Beverages",
    colorKey: "purple",
    iconName: "cup-soda",
    description: "Coffee, tea, soda, juice, water",
  },
  snacks: {
    name: "Snacks",
    colorKey: "yellow",
    iconName: "cookie",
    description: "Chips, crackers, nuts, candy, chocolate",
  },
  pantry: {
    name: "Pantry",
    colorKey: "orange",
    iconName: "package",
    description: "Pasta, rice, cereal, soups, vegetables, sauces",
  },
  "personal-care": {
    name: "Personal Care",
    colorKey: "pink",
    iconName: "bath",
    description: "Soap, lotions, deodorant, toothpaste, floss",
  },
  household: {
    name: "Household",
    colorKey: "gray",
    iconName: "house",
    description: "Paper towels, tissues, cleaners, supplies",
  },
  other: {
    name: "Other",
    colorKey: "zinc",
    iconName: "circle-off",
    description: "Other",
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

  return {
    name: config.name,
    color,
    colorKey: config.colorKey,
    icon: <Icon name={config.iconName} size={iconSize} className={color} />,
    description: config.description,
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
