import type { Page } from "@playwright/test";

/**
 * Tests always pick an explicit category so the AI auto-select path
 * (which needs credits and a slow model call) is never exercised in e2e.
 */
export async function selectShoppingListCategory(
  page: Page,
  categoryId: string,
) {
  await page.getByTestId("category-selector-trigger").click();
  await page.getByTestId("category-selector-title").waitFor();
  await page.getByTestId(`category-selector-option-${categoryId}`).click();
}

export async function selectExpenseCategory(page: Page, categoryId: string) {
  await page.getByTestId("expense-form-category").click();
  await page.getByTestId(`expense-category-option-${categoryId}`).click();
}
