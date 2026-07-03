import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";
import { selectExpenseCategory } from "../helpers/categories";

async function createTestExpense(
  page: Page,
): Promise<{ expenseId: number; description: string }> {
  await page.goto("/expenses");
  await page.getByTestId("expense-add-button").click();

  const amountInput = page.getByTestId("expense-form-amount");
  await amountInput.click();
  await amountInput.clear();
  await amountInput.pressSequentially("25.00");

  const paidByTrigger = page.getByTestId("expense-form-paid-by");
  if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
    await paidByTrigger.click();
    await page.getByRole("option").first().click();
  }

  const uniqueDesc = `Test dinner ${Date.now()}`;
  await page.getByTestId("expense-form-description").fill(uniqueDesc);
  await selectExpenseCategory(page, "restaurant");
  await page.getByTestId("expense-form-next").click();

  await page.getByTestId("expense-form-next").click();

  await page.getByTestId("expense-form-submit").click();

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

async function openExpenseDetail(page: Page, description: string) {
  const expenseCard = page
    .getByTestId(/^expense-card-\d+$/)
    .filter({ hasText: description })
    .first();

  if (!(await expenseCard.isVisible().catch(() => false))) {
    await page.goto("/expenses");
    await expect(expenseCard).toBeVisible({ timeout: 15000 });
  }

  // The list rerenders right after creation (query invalidation), which can
  // swallow the first click, so retry until the detail view actually opens.
  await expect(async () => {
    await expenseCard.click();
    await expect(page.getByTestId("expense-delete-button")).toBeVisible({
      timeout: 3000,
    });
  }).toPass({ timeout: 20000 });
}

test.describe("Expense Management", () => {
  test("View Details: clicking an expense opens a detail view showing the total, payer, and splits", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const { expenseId, description } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, description);

    await expect(authPage.getByTestId("expense-split-details")).toBeVisible({
      timeout: 15000,
    });
    await expect(authPage.getByText("€25.00").first()).toBeVisible();
    await expect(authPage.getByText("Paid by").first()).toBeVisible();
  });

  test("Edit Expense: changing the amount updates the record", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const { expenseId, description } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, description);

    await expect(authPage.getByTestId("expense-edit-button")).toBeVisible({
      timeout: 15000,
    });
    await authPage.getByTestId("expense-edit-button").click();
    await authPage.waitForFunction(
      () => new URL(window.location.href).searchParams.get("action") === "edit",
      {},
      { timeout: 10000 },
    );

    await expect(authPage.getByTestId("expense-form-title")).toBeVisible({
      timeout: 10000,
    });
    await expect(authPage.getByTestId("expense-form-title")).toContainText(
      "Edit Expense",
    );

    const amountInput = authPage.getByTestId("expense-form-amount");
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("50.00");
    await authPage.getByTestId("expense-form-next").click();
    await authPage.getByTestId("expense-form-next").click();
    await authPage.getByTestId("expense-form-submit").click();

    await expect(authPage.getByText("€50.00").first()).toBeVisible();
  });

  test("Delete Expense: deleting an expense removes it from the list", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const { expenseId, description: desc } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, desc);

    await expect(authPage.getByTestId("expense-delete-button")).toBeVisible({
      timeout: 15000,
    });
    await authPage.getByTestId("expense-delete-button").click();

    await expect(authPage.getByTestId("expense-delete-dialog")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      authPage.getByTestId("expense-delete-dialog").getByText("Delete Expense"),
    ).toBeVisible();

    await authPage.getByTestId("expense-delete-confirm-button").click();

    await expect(
      authPage.getByTestId("expense-delete-dialog"),
    ).not.toBeVisible();
    await expect(
      authPage.getByTestId(/^expense-card-\d+$/).filter({ hasText: desc }),
    ).not.toBeVisible();
  });
});
