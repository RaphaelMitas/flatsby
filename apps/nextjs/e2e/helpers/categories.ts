import type { Page } from "@playwright/test";

async function pickFromSheet(page: Page, trigger: string, option: string) {
  await page.getByTestId(trigger).click();
  const choice = page.getByTestId(option);
  await choice.click();
  await choice.waitFor({ state: "hidden" });
}

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
