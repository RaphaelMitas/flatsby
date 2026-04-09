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

import { cn } from "..";

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

const groupColorClassMap: Record<string, string> = {
  primary: "text-primary",
  orange: "text-orange-600 dark:text-orange-300",
  blue: "text-blue-600 dark:text-blue-300",
  cyan: "text-cyan-600 dark:text-cyan-300",
  pink: "text-pink-600 dark:text-pink-300",
  purple: "text-purple-600 dark:text-purple-300",
  gray: "text-gray-600 dark:text-gray-300",
  red: "text-red-600 dark:text-red-300",
  green: "text-green-600 dark:text-green-300",
  yellow: "text-yellow-600 dark:text-yellow-300",
  zinc: "text-zinc-600 dark:text-zinc-300",
};

const groupBgClassMap: Record<string, string> = {
  primary: "bg-primary/10",
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

const groupBorderClassMap: Record<string, string> = {
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

function getColorKey(groupId: string): string {
  if (groupId === "auto") return "primary";
  return isExpenseCategoryGroup(groupId)
    ? expenseCategoryGroupColorKeys[groupId]
    : "zinc";
}

export function getExpenseCategoryColorClasses(groupId: string) {
  const colorKey = getColorKey(groupId);
  return {
    base: cn(groupColorClassMap[colorKey]),
    bg: cn(groupBgClassMap[colorKey]),
    border: cn(groupBorderClassMap[colorKey]),
  };
}

export interface ExpenseCategoryDataItem {
  id: string;
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

export {
  AI_AUTO_DETECT,
  expenseCategoryGroupLabels,
  expenseCategoryGroupColorKeys,
};
