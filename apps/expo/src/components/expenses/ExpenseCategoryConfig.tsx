import type {
  ExpenseCategoryGroup,
  ExpenseSubcategoryIdWithAuto,
} from "@flatsby/validators/expenses/categories";
import type {
  CategoryColorKey,
  CategoryColorVariant,
} from "@flatsby/validators/expenses/category-colors";

import {
  AI_AUTO_DETECT,
  expenseCategoryGroupColorKeys,
  expenseCategoryGroupLabels,
  expenseSubcategories,
  expenseSubcategoryIdsWithAuto,
} from "@flatsby/validators/expenses/categories";
import {
  categoryBgColorMap,
  categoryBorderColorMap,
  getCategoryTextColor,
  isCategoryColorKey,
} from "@flatsby/validators/expenses/category-colors";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import Icon from "~/lib/ui/custom/icons/Icon";

const iconSize = 14;

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

  const color = getCategoryTextColor(entry.colorKey, colorVariant);
  const bgColor = categoryBgColorMap[entry.colorKey];
  const borderColor = categoryBorderColorMap[entry.colorKey];

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
export type { CategoryColorKey, CategoryColorVariant };
