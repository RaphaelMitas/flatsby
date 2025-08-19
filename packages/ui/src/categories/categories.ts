import {
  Bath,
  Beef,
  CakeSlice,
  Carrot,
  CircleOff,
  Cookie,
  CupSoda,
  Home,
  Milk,
  Package,
  Snowflake,
  WandSparkles,
} from "lucide-react";

import type { Category } from "./types";
import { cn } from "..";

export const getCategoryColorClasses = (categoryId: string) => ({
  base: cn(
    categoryId === "ai-auto-select" &&
      "text-primary-foreground dark:text-primary",
    categoryId === "produce" && "text-green-600 dark:text-green-300",
    categoryId === "meat-seafood" && "text-red-600 dark:text-red-300",
    categoryId === "dairy" && "text-blue-600 dark:text-blue-300",
    categoryId === "bakery" && "text-orange-600 dark:text-orange-300",
    categoryId === "frozen-foods" && "text-cyan-600 dark:text-cyan-300",
    categoryId === "beverages" && "text-purple-600 dark:text-purple-300",
    categoryId === "snacks" && "text-yellow-600 dark:text-yellow-300",
    categoryId === "pantry" && "text-orange-600 dark:text-orange-300",
    categoryId === "personal-care" && "text-pink-600 dark:text-pink-300",
    categoryId === "household" && "text-gray-600 dark:text-gray-300",
    categoryId === "other" && "text-zinc-600 dark:text-zinc-300",
  ),
  hover: cn(
    categoryId === "ai-auto-select" &&
      "md:group-hover:text-primary md:group-hover:dark:text-primary-foreground",
    categoryId === "produce" &&
      "md:group-hover:text-green-300 md:group-hover:dark:text-green-600",
    categoryId === "meat-seafood" &&
      "md:group-hover:text-red-300 md:group-hover:dark:text-red-600",
    categoryId === "dairy" &&
      "md:group-hover:text-blue-300 md:group-hover:dark:text-blue-600",
    categoryId === "bakery" &&
      "md:group-hover:text-orange-300 md:group-hover:dark:text-orange-600",
    categoryId === "frozen-foods" &&
      "md:group-hover:text-cyan-300 md:group-hover:dark:text-cyan-600",
    categoryId === "beverages" &&
      "md:group-hover:text-purple-300 md:group-hover:dark:text-purple-600",
    categoryId === "snacks" &&
      "md:group-hover:text-yellow-300 md:group-hover:dark:text-yellow-600",
    categoryId === "pantry" &&
      "md:group-hover:text-orange-300 md:group-hover:dark:text-orange-600",
    categoryId === "personal-care" &&
      "md:group-hover:text-pink-300 md:group-hover:dark:text-pink-600",
    categoryId === "household" &&
      "md:group-hover:text-gray-300 md:group-hover:dark:text-gray-600",
    categoryId === "other" &&
      "md:group-hover:text-zinc-300 md:group-hover:dark:text-zinc-600",
  ),
});

export const getCategoryData = (categoryId: string) => {
  return categoryMapping.find((category) => category.id === categoryId);
};

const categories: Category[] = [
  {
    id: "ai-auto-select",
    name: "AI Auto Select",
    icon: WandSparkles,
    description: "AI will select the most appropriate category for the item",
  },
  {
    id: "produce",
    name: "Produce",
    icon: Carrot,
    description: "Fruits, vegetables, fresh herbs",
  },
  {
    id: "meat-seafood",
    name: "Meat & Fish",
    icon: Beef,
    description: "Beef, chicken, pork, fish, seafood",
  },
  {
    id: "dairy",
    name: "Dairy",
    icon: Milk,
    description: "Milk, cheese, yogurt, eggs",
  },
  {
    id: "bakery",
    name: "Bakery",
    icon: CakeSlice,
    description: "Bread, cakes, pastries, muffins",
  },
  {
    id: "frozen-foods",
    name: "Frozen Foods",
    icon: Snowflake,
    description: "Frozen dinners, pizza, ice cream",
  },
  {
    id: "beverages",
    name: "Beverages",
    icon: CupSoda,
    description: "Coffee, tea, soda, juice, water",
  },
  {
    id: "snacks",
    name: "Snacks",
    icon: Cookie,
    description: "Chips, crackers, nuts, candy, chocolate",
  },
  {
    id: "pantry",
    name: "Pantry",
    icon: Package,
    description: "Pasta, rice, cereal, soups, vegetables, sauces",
  },
  {
    id: "personal-care",
    name: "Personal Care",
    icon: Bath,
    description: "Soap, lotions, deodorant, toothpaste, floss",
  },
  {
    id: "household",
    name: "Household",
    icon: Home,
    description: "Paper towels, tissues, cleaners, supplies",
  },
  {
    id: "other",
    name: "Other",
    icon: CircleOff,
    description: "Other",
  },
];

const categoryMapping = categories.map((category) => {
  const colors = getCategoryColorClasses(category.id);
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    colorClasses: colors,
  };
});

export { categories, categoryMapping };
