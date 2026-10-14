import type {
  CategoryColorKey,
  CategoryColorVariant,
} from "@flatsby/validators/expenses/category-colors";

import {
  AI_AUTO_DETECT,
  expenseCategoryGroupColorKeys,
  expenseCategoryLabelKeys,
  expenseSubcategories,
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
  iconName: IconProps["name"];
  colorKey: CategoryColorKey;
}

const otherEntry: SubcategoryEntry = {
  iconName: "circle-help",
  colorKey: "zinc",
};

const subcategoryRecord: Record<string, SubcategoryEntry> = {
  [AI_AUTO_DETECT]: {
    iconName: "wand-sparkles",
    colorKey: "primary",
  },
};

for (const sub of expenseSubcategories) {
  const rawColorKey = expenseCategoryGroupColorKeys[sub.group];

  if (isCategoryColorKey(rawColorKey)) {
    subcategoryRecord[sub.id] = {
      iconName: sub.icon,
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
    ...expenseCategoryLabelKeys(subcategoryId),
    color,
    bgColor,
    borderColor,
    colorKey: entry.colorKey,
    icon: <Icon name={entry.iconName} size={iconSize} className={color} />,
  };
}
