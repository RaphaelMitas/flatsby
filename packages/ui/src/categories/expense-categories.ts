import type { ExpenseSubcategoryIdWithAuto } from "@flatsby/validators/expenses/categories";
import type { CategoryColorKey } from "@flatsby/validators/expenses/category-colors";
import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Armchair,
  Bed,
  BookOpen,
  Car,
  CarTaxiFront,
  CircleEllipsis,
  CircleHelp,
  Clapperboard,
  Coffee,
  Droplets,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartHandshake,
  House,
  IdCard,
  Lamp,
  MapPin,
  Music,
  Phone,
  Pill,
  Pizza,
  Plane,
  Shirt,
  ShoppingCart,
  Smartphone,
  SquareParking,
  Stethoscope,
  Ticket,
  TrainFront,
  Tv,
  Utensils,
  WandSparkles,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from "lucide-react";

import {
  AI_AUTO_DETECT,
  expenseCategoryGroupColorKeys,
  expenseCategoryGroupLabels,
  expenseSubcategories,
  isExpenseCategoryGroup,
} from "@flatsby/validators/expenses/categories";
import {
  categoryBgColorMap,
  categoryBorderColorMap,
  categoryTextColorMap,
} from "@flatsby/validators/expenses/category-colors";

const subcategoryIconMap: Record<string, LucideIcon> = {
  [AI_AUTO_DETECT]: WandSparkles,
  restaurant: Utensils,
  coffee: Coffee,
  bar: Wine,
  groceries: ShoppingCart,
  "fast-food": Pizza,
  "other-food-drinks": CircleEllipsis,
  "ride-sharing": Car,
  "public-transit": TrainFront,
  gas: Fuel,
  parking: SquareParking,
  taxi: CarTaxiFront,
  "other-transport": CircleEllipsis,
  clothes: Shirt,
  electronics: Smartphone,
  "home-goods": Lamp,
  "other-shopping": CircleEllipsis,
  movies: Clapperboard,
  games: Gamepad2,
  sports: Dumbbell,
  events: Ticket,
  music: Music,
  "other-entertainment": CircleEllipsis,
  rent: House,
  maintenance: Wrench,
  furniture: Armchair,
  "other-housing": CircleEllipsis,
  electric: Zap,
  water: Droplets,
  internet: Wifi,
  phone: Phone,
  "other-utilities": CircleEllipsis,
  doctor: Stethoscope,
  pharmacy: Pill,
  gym: Dumbbell,
  "other-health": CircleEllipsis,
  hotel: Bed,
  flight: Plane,
  activities: MapPin,
  "other-travel": CircleEllipsis,
  streaming: Tv,
  software: AppWindow,
  membership: IdCard,
  "other-subscriptions": CircleEllipsis,
  courses: GraduationCap,
  books: BookOpen,
  "other-education": CircleEllipsis,
  gift: Gift,
  donation: HeartHandshake,
  "other-gifts": CircleEllipsis,
  other: CircleHelp,
};

function getColorKey(groupId: string): CategoryColorKey {
  if (groupId === "auto") return "primary";
  return isExpenseCategoryGroup(groupId)
    ? expenseCategoryGroupColorKeys[groupId]
    : "zinc";
}

export function getExpenseCategoryColorClasses(groupId: string) {
  const colorKey = getColorKey(groupId);
  return {
    base: categoryTextColorMap[colorKey].default,
    bg: categoryBgColorMap[colorKey],
    border: categoryBorderColorMap[colorKey],
  };
}

export interface ExpenseCategoryDataItem {
  id: ExpenseSubcategoryIdWithAuto;
  name: string;
  description: string;
  groupId: string;
  groupName: string;
  icon: LucideIcon;
  colorClasses: { base: string; bg: string; border: string };
}

const otherFallback: ExpenseCategoryDataItem = {
  id: "other",
  name: "Other",
  description: "Other",
  groupId: "other",
  groupName: "Other",
  icon: CircleHelp,
  colorClasses: getExpenseCategoryColorClasses("other"),
};

const expenseCategoryDataRecord: Record<string, ExpenseCategoryDataItem> = {
  [AI_AUTO_DETECT]: {
    id: AI_AUTO_DETECT,
    name: "AI Auto Detect",
    description: "AI will detect the category from the description",
    groupId: "auto",
    groupName: "Auto",
    icon: WandSparkles,
    colorClasses: getExpenseCategoryColorClasses("auto"),
  },
};

for (const sub of expenseSubcategories) {
  const groupName = expenseCategoryGroupLabels[sub.group];
  const icon = subcategoryIconMap[sub.id] ?? CircleHelp;
  const colorClasses = getExpenseCategoryColorClasses(sub.group);

  expenseCategoryDataRecord[sub.id] = {
    id: sub.id,
    name: sub.label,
    description: groupName,
    groupId: sub.group,
    groupName,
    icon,
    colorClasses,
  };
}

export function getExpenseCategoryData(
  subcategoryId: string,
): ExpenseCategoryDataItem {
  return expenseCategoryDataRecord[subcategoryId] ?? otherFallback;
}

export function getAllExpenseCategoryItems(): ExpenseCategoryDataItem[] {
  return Object.values(expenseCategoryDataRecord);
}

export { AI_AUTO_DETECT };
