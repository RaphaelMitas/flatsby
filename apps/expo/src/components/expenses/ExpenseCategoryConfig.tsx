import type {
  ExpenseCategoryGroup,
  ExpenseSubcategoryIdWithAuto,
} from "@flatsby/validators/expenses/categories";
import type { CategoryColorKey } from "@flatsby/validators/expenses/category-colors";

import {
  AI_AUTO_DETECT,
  expenseCategoryGroupColorKeys,
  expenseCategoryGroupLabels,
  expenseSubcategories,
  expenseSubcategoryIdsWithAuto,
} from "@flatsby/validators/expenses/categories";
import {
  getNativeCategoryColor,
  isCategoryColorKey,
} from "@flatsby/validators/expenses/category-colors";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { CategoryIcon } from "~/lib/ui/category-icon";

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
  isDark = false,
}: {
  subcategoryId: string;
  isDark?: boolean;
}) {
  const entry = subcategoryRecord[subcategoryId] ?? otherEntry;
  const nativeColors = getNativeCategoryColor(entry.colorKey, isDark);

  return {
    name: entry.name,
    description: entry.description,
    groupName: entry.groupName,
    colorKey: entry.colorKey,
    nativeColors,
    icon: (
      <CategoryIcon
        name={entry.iconName}
        size={iconSize}
        color={nativeColors.text}
      />
    ),
  };
}

export { AI_AUTO_DETECT, expenseSubcategoryIdsWithAuto };
export type { ExpenseSubcategoryIdWithAuto };
export type { CategoryColorKey };
