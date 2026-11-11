import type { Page } from "@playwright/test";

async function pickFromSheet(page: Page, trigger: string, option: string) {
  await page.getByTestId(trigger).click();
  const choice = page.getByTestId(option);
  await choice.click();
  // Radix dismisses a sheet that is reopened while it still animates out
  await choice.waitFor({ state: "hidden" });
}

/**
 * Tests always pick an explicit category so the AI auto-select path
 * (which needs credits and a slow model call) is never exercised in e2e.
 */
export const selectShoppingListCategory = (page: Page, categoryId: string) =>
  pickFromSheet(
    page,
    "category-selector-trigger",
    `category-selector-option-${categoryId}`,
  );

export const selectExpenseCategory = (page: Page, categoryId: string) =>
  pickFromSheet(
    page,
    "expense-form-category",
    `expense-category-option-${categoryId}`,
  );
