import type React from "react";
import { useMemo } from "react";
import { View } from "react-native";

import type {
  BottomSheetPickerItem,
  BottomSheetPickerTriggerProps,
} from "~/lib/ui/bottom-sheet-picker";
import { BottomSheetPickerTrigger } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";

export type CategoryIdWithAiAutoSelect =
  | "ai-auto-select"
  | "other"
  | "produce"
  | "meat-seafood"
  | "dairy"
  | "bakery"
  | "frozen-foods"
  | "beverages"
  | "snacks"
  | "pantry"
  | "personal-care"
  | "household";

// All available categories - centralized list to avoid duplication
export const allCategories = [
  "ai-auto-select",
  "produce",
  "meat-seafood",
  "dairy",
  "bakery",
  "frozen-foods",
  "beverages",
  "snacks",
  "pantry",
  "personal-care",
  "household",
  "other",
] as const;

export const getCategoryData = (categoryId: CategoryIdWithAiAutoSelect) => {
  const iconSize = 20;
  const categoryMap = {
    "ai-auto-select": {
      name: "AI Auto Select",
      color: "text-primary",
      icon: (
        <Icon name="wand-sparkles" size={iconSize} className="text-primary" />
      ),
      description: "AI will select the most appropriate category for the item",
    },
    produce: {
      name: "Produce",
      color: "text-green-600 dark:text-green-300",
      icon: (
        <Icon
          name="carrot"
          size={iconSize}
          className="text-green-600 dark:text-green-300"
        />
      ),
      description: "Fruits, vegetables, fresh herbs",
    },
    "meat-seafood": {
      name: "Meat & Fish",
      color: "text-red-600 dark:text-red-300",
      icon: (
        <Icon
          name="beef"
          size={iconSize}
          className="text-red-600 dark:text-red-300"
        />
      ),
      description: "Beef, chicken, pork, fish, seafood",
    },
    dairy: {
      name: "Dairy",
      color: "text-blue-600 dark:text-blue-300",
      icon: (
        <Icon
          name="milk"
          size={iconSize}
          className="text-blue-600 dark:text-blue-300"
        />
      ),
      description: "Milk, cheese, yogurt, eggs",
    },
    bakery: {
      name: "Bakery",
      color: "text-orange-600 dark:text-orange-300",
      icon: (
        <Icon
          name="cake-slice"
          size={iconSize}
          className="text-orange-600 dark:text-orange-300"
        />
      ),
      description: "Bread, cakes, pastries, muffins",
    },
    "frozen-foods": {
      name: "Frozen Foods",
      color: "text-cyan-600 dark:text-cyan-300",
      icon: (
        <Icon
          name="snowflake"
          size={iconSize}
          className="text-cyan-600 dark:text-cyan-300"
        />
      ),
      description: "Frozen dinners, pizza, ice cream",
    },
    beverages: {
      name: "Beverages",
      color: "text-purple-600 dark:text-purple-300",
      icon: (
        <Icon
          name="cup-soda"
          size={iconSize}
          className="text-purple-600 dark:text-purple-300"
        />
      ),
      description: "Coffee, tea, soda, juice, water",
    },
    snacks: {
      name: "Snacks",
      color: "text-yellow-600 dark:text-yellow-300",
      icon: (
        <Icon
          name="cookie"
          size={iconSize}
          className="text-yellow-600 dark:text-yellow-300"
        />
      ),
      description: "Chips, crackers, nuts, candy, chocolate",
    },
    pantry: {
      name: "Pantry",
      color: "text-orange-600 dark:text-orange-300",
      icon: (
        <Icon
          name="package"
          size={iconSize}
          className="text-orange-600 dark:text-orange-300"
        />
      ),
      description: "Pasta, rice, cereal, soups, vegetables, sauces",
    },
    "personal-care": {
      name: "Personal Care",
      color: "text-pink-600 dark:text-pink-300",
      icon: (
        <Icon
          name="bath"
          size={iconSize}
          className="text-pink-600 dark:text-pink-300"
        />
      ),
      description: "Soap, lotions, deodorant, toothpaste, floss",
    },
    household: {
      name: "Household",
      color: "text-gray-600 dark:text-gray-300",
      icon: (
        <Icon
          name="house"
          size={iconSize}
          className="text-gray-600 dark:text-gray-300"
        />
      ),
      description: "Paper towels, tissues, cleaners, supplies",
    },
    other: {
      name: "Other",
      color: "text-zinc-600 dark:text-zinc-300",
      icon: (
        <Icon
          name="circle-off"
          size={iconSize}
          className="text-zinc-600 dark:text-zinc-300"
        />
      ),
      description: "Other",
    },
  };

  return categoryMap[categoryId];
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
    return allCategories
      .filter((categoryId) => !excludeCategories.includes(categoryId))
      .map((categoryId) => {
        const categoryData = getCategoryData(categoryId);
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

  const selectedCategory = value ? getCategoryData(value) : null;
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
