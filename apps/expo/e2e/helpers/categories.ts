import { by, element, waitFor } from "detox";

import { safeTapId, scrollToMatcher } from "./interaction";

type Matcher = Parameters<typeof element>[0];

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

const PICKER_OPEN_MARKERS = [
  "picker-option-produce",
  "picker-option-ai-auto-select",
  "picker-option-groceries",
] as const;

function pickerOptionId(categoryId: string): string {
  return `picker-option-${categoryId}`;
}

function pickerOptionMatcher(categoryId: string): Matcher {
  return by.id(pickerOptionId(categoryId));
}

async function isPickerOptionVisible(categoryId: string): Promise<boolean> {
  try {
    await waitFor(element(pickerOptionMatcher(categoryId)))
      .toBeVisible()
      .withTimeout(500);
    return true;
  } catch {
    return false;
  }
}

async function isPickerOpen(): Promise<boolean> {
  for (const markerId of PICKER_OPEN_MARKERS) {
    try {
      await waitFor(element(by.id(markerId))).toBeVisible().withTimeout(500);
      return true;
    } catch {
      // Try the next known option id.
    }
  }
  return false;
}

async function waitForPickerOption(
  categoryId: string,
  timeout = 5_000,
): Promise<void> {
  const option = element(pickerOptionMatcher(categoryId));
  const scrollViews = [by.type("UIScrollView"), by.type("RCTScrollView")];

  try {
    await waitFor(option).toBeVisible().withTimeout(timeout);
    return;
  } catch {
    // Option may be off-screen inside the bottom sheet list.
  }

  for (const scrollMatcher of scrollViews) {
    try {
      await waitFor(option)
        .toBeVisible()
        .whileElement(scrollMatcher)
        .scroll(150, "down");
      return;
    } catch {
      // Try the next scroll container type.
    }
  }

  await waitFor(option).toBeVisible().withTimeout(timeout);
}

async function waitForPickerClosed(
  categoryId: string,
  timeout = 5_000,
): Promise<void> {
  await waitFor(element(pickerOptionMatcher(categoryId)))
    .not.toBeVisible()
    .withTimeout(timeout);
}

async function openPickerTrigger(
  testId: string,
  categoryId: string,
): Promise<void> {
  if (
    (await isPickerOpen()) ||
    (await isPickerOptionVisible(categoryId))
  ) {
    return;
  }

  await scrollToMatcher(by.id(testId));

  for (let attempt = 0; attempt < 3; attempt++) {
    await safeTapId(testId, { timeout: 8_000, retries: 2 });

    try {
      await waitForPickerOption(categoryId, 3_000);
      return;
    } catch {
      if (await isPickerOpen()) {
        return;
      }
    }
  }

  await waitForPickerOption(categoryId, 5_000);
}

async function selectPickerOption(
  categoryId: string,
  label: string,
): Promise<void> {
  const option = element(pickerOptionMatcher(categoryId));

  await waitForPickerOption(categoryId, 5_000);

  try {
    await option.tap();
  } catch {
    await element(by.text(label)).tap();
  }

  await waitForPickerClosed(categoryId, 5_000);
}

export async function selectShoppingListCategory(
  categoryId: string,
): Promise<void> {
  await openPickerTrigger("category-selector-trigger", categoryId);
  const label = SHOPPING_CATEGORY_LABELS[categoryId] ?? categoryId;
  await selectPickerOption(categoryId, label);
}

export async function selectExpenseCategory(categoryId: string): Promise<void> {
  await openPickerTrigger("expense-form-category", categoryId);
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
