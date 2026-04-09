import type {
  ExpenseCategoryGroup,
  ExpenseSubcategoryIdWithAuto,
} from "@flatsby/validators/expenses/categories";

import {
  AI_AUTO_DETECT,
  expenseCategoryGroupColorKeys,
  expenseCategoryGroupLabels,
  expenseSubcategories,
  expenseSubcategoryIdsWithAuto,
} from "@flatsby/validators/expenses/categories";

import type {
  CategoryColorKey,
  CategoryColorVariant,
} from "~/components/shoppingList/ShoppingListCategory";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import {
  CATEGORY_COLORS,
  getCategoryColor,
} from "~/components/shoppingList/ShoppingListCategory";
import Icon from "~/lib/ui/custom/icons/Icon";

const iconSize = 20;

function isCategoryColorKey(value: string): value is CategoryColorKey {
  return value in CATEGORY_COLORS;
}

const BG_COLORS: Record<string, string> = {
  primary: "bg-primary/15",
  orange: "bg-orange-100 dark:bg-orange-900/30",
  blue: "bg-blue-100 dark:bg-blue-900/30",
  cyan: "bg-cyan-100 dark:bg-cyan-900/30",
  pink: "bg-pink-100 dark:bg-pink-900/30",
  purple: "bg-purple-100 dark:bg-purple-900/30",
  gray: "bg-gray-100 dark:bg-gray-900/30",
  red: "bg-red-100 dark:bg-red-900/30",
  green: "bg-green-100 dark:bg-green-900/30",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30",
  zinc: "bg-zinc-100 dark:bg-zinc-900/30",
};

const BORDER_COLORS: Record<string, string> = {
  primary: "border-primary/40",
  orange: "border-orange-300 dark:border-orange-700",
  blue: "border-blue-300 dark:border-blue-700",
  cyan: "border-cyan-300 dark:border-cyan-700",
  pink: "border-pink-300 dark:border-pink-700",
  purple: "border-purple-300 dark:border-purple-700",
  gray: "border-gray-300 dark:border-gray-700",
  red: "border-red-300 dark:border-red-700",
  green: "border-green-300 dark:border-green-700",
  yellow: "border-yellow-300 dark:border-yellow-700",
  zinc: "border-zinc-300 dark:border-zinc-700",
};

interface SubcategoryEntry {
  name: string;
  description: string;
  iconName: IconProps["name"];
  groupId: ExpenseCategoryGroup | "auto";
  groupName: string;
  colorKey: CategoryColorKey;
}

const otherEntry: SubcategoryEntry = {
  name: "Other",
  description: "Other",
  iconName: "circle-help",
  groupId: "other",
  groupName: "Other",
  colorKey: "zinc",
};

const subcategoryRecord: Record<string, SubcategoryEntry> = {
  [AI_AUTO_DETECT]: {
    name: "AI Auto Detect",
    description: "AI will detect the category from the description",
    iconName: "wand-sparkles",
    groupId: "auto",
    groupName: "Auto",
    colorKey: "primary",
  },
};

for (const sub of expenseSubcategories) {
  const groupLabel = expenseCategoryGroupLabels[sub.group];
  const rawColorKey = expenseCategoryGroupColorKeys[sub.group];

  if (isCategoryColorKey(rawColorKey)) {
    subcategoryRecord[sub.id] = {
      name: sub.label,
      description: groupLabel,
      iconName: sub.icon,
      groupId: sub.group,
      groupName: groupLabel,
      colorKey: rawColorKey,
    };
  }
}

export function getExpenseCategoryData({
  subcategoryId,
  colorVariant = "default",
}: {
  subcategoryId: string;
  colorVariant?: CategoryColorVariant;
}) {
  const entry = subcategoryRecord[subcategoryId] ?? otherEntry;

  const color = getCategoryColor(entry.colorKey, colorVariant);
  const bgColor = BG_COLORS[entry.colorKey];
  const borderColor = BORDER_COLORS[entry.colorKey];

  return {
    name: entry.name,
    description: entry.description,
    groupName: entry.groupName,
    color,
    bgColor,
    borderColor,
    colorKey: entry.colorKey,
    icon: <Icon name={entry.iconName} size={iconSize} className={color} />,
  };
}

export { AI_AUTO_DETECT, expenseSubcategoryIdsWithAuto };
export type { ExpenseSubcategoryIdWithAuto };
export { CATEGORY_COLORS, getCategoryColor };
export type { CategoryColorKey, CategoryColorVariant };
