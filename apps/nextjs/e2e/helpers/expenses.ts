import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { selectExpenseCategory } from "./categories";

export async function ensurePaidBySelected(page: Page) {
  const paidByTrigger = page.getByTestId("expense-form-paid-by");
  if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
    await paidByTrigger.click();
    await page.getByRole("option").first().click();
  }
}

export async function fillExpenseAmount(page: Page, amount: string) {
  const amountInput = page.getByTestId("expense-form-amount");
  await amountInput.click();
  await amountInput.clear();
  await amountInput.pressSequentially(amount);
}

export async function openExpenseForm(
  page: Page,
  options: { amount: string; description: string; categoryId: string },
) {
  await page.getByTestId("expense-add-button").click();
  await fillExpenseAmount(page, options.amount);
  await ensurePaidBySelected(page);
  await page.getByTestId("expense-form-description").fill(options.description);
  await selectExpenseCategory(page, options.categoryId);
}

export async function submitEqualSplitExpense(page: Page) {
  await page.getByTestId("expense-form-next").click();
  await page.getByTestId("expense-form-next").click();
  await page.getByTestId("expense-form-submit").click();
}

export async function createEqualSplitExpense(
  page: Page,
  options: { amount: string; description: string; categoryId: string },
): Promise<string> {
  await page.goto("/expenses");
  await openExpenseForm(page, options);
  await submitEqualSplitExpense(page);
  return options.description;
}

export async function createTestExpense(
  page: Page,
): Promise<{ expenseId: number; description: string }> {
  await page.goto("/expenses");
  const uniqueDesc = `Test dinner ${Date.now()}`;
  await openExpenseForm(page, {
    amount: "25.00",
    description: uniqueDesc,
    categoryId: "restaurant",
  });
  await submitEqualSplitExpense(page);

  await expect(page.getByTestId("expense-form-title")).not.toBeVisible({
    timeout: 15000,
  });

  const expenseCard = page
    .getByTestId(/^expense-card-\d+$/)
    .filter({ hasText: uniqueDesc })
    .first();
  await expect(expenseCard).toBeVisible({ timeout: 10000 });
  const testId = await expenseCard.getAttribute("data-testid");
  const match = testId?.match(/expense-card-(\d+)/);
  const expenseIdFromMatch = match?.[1];
  if (expenseIdFromMatch === undefined) {
    throw new Error("Could not extract expense ID from data-testid");
  }
  return {
    expenseId: parseInt(expenseIdFromMatch, 10),
    description: uniqueDesc,
  };
}

export async function openExpenseDetail(page: Page, description: string) {
  const expenseCard = page
    .getByTestId(/^expense-card-\d+$/)
    .filter({ hasText: description })
    .first();

  if (!(await expenseCard.isVisible().catch(() => false))) {
    await page.goto("/expenses");
    await expect(expenseCard).toBeVisible({ timeout: 15000 });
  }

  await expect(async () => {
    await expenseCard.click();
    await expect(page.getByTestId("expense-delete-button")).toBeVisible({
      timeout: 3000,
    });
  }).toPass({ timeout: 20000 });
}
