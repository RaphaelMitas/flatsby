import { by, element, waitFor } from "detox";

import { tapIdUntilVisible, tapUntilVisible } from "./interaction";

const SHOPPING_CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  dairy: "Dairy",
  bakery: "Bakery",
  other: "Other",
  "meat-seafood": "Meat & Fish",
  "frozen-foods": "Frozen Foods",
  beverages: "Beverages",
  snacks: "Snacks",
  pantry: "Pantry",
  "personal-care": "Personal Care",
  household: "Household",
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  restaurant: "Restaurant",
  coffee: "Coffee",
  "other-housing": "Other Housing",
};

async function openBottomSheet(trigger: {
  testId: string;
  fallbackText?: string;
}): Promise<void> {
  try {
    await element(by.id(trigger.testId)).tap();
    return;
  } catch {
    if (trigger.fallbackText) {
      await element(by.text(trigger.fallbackText)).tap();
    }
  }
}

async function selectPickerOption(
  categoryId: string,
  label: string,
): Promise<void> {
  try {
    await waitFor(element(by.id(`picker-option-${categoryId}`)))
      .toExist()
      .withTimeout(2_000);
    await element(by.id(`picker-option-${categoryId}`)).tap();
    return;
  } catch {
    await element(by.text(label)).tap();
  }
}

export async function selectShoppingListCategory(
  categoryId: string,
): Promise<void> {
  await openBottomSheet({
    testId: "category-selector-trigger",
    fallbackText: "Other",
  });
  const label = SHOPPING_CATEGORY_LABELS[categoryId] ?? categoryId;
  await selectPickerOption(categoryId, label);
}

export async function selectExpenseCategory(categoryId: string): Promise<void> {
  await openBottomSheet({
    testId: "expense-form-category",
    fallbackText: "Category",
  });
  const label = EXPENSE_CATEGORY_LABELS[categoryId] ?? categoryId;
  await selectPickerOption(categoryId, label);
}

export async function selectSplitMethod(
  method: "equal" | "percentage" | "custom",
): Promise<void> {
  const testIds = {
    equal: "split-method-equal",
    percentage: "split-method-percentage",
    custom: "split-method-custom",
  } as const;
  const labels = {
    equal: "Equal",
    percentage: "Percentage",
    custom: "Custom",
  } as const;

  try {
    await element(by.id(testIds[method])).tap();
  } catch {
    await element(by.text(labels[method])).tap();
  }
}
