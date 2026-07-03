import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function createTestExpense(page: Page): Promise<{ expenseId: number; description: string }> {
  await page.goto("/expenses");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForLoadState("networkidle");

  const amountInput = page.getByPlaceholder("0.00").first();
  await amountInput.click();
  await amountInput.clear();
  await amountInput.pressSequentially("25.00");

  const paidByTrigger = page.getByRole("combobox", { name: "Paid By" }).first();
  if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
    await paidByTrigger.click();
    await page.getByRole("option").first().click();
  }

  const uniqueDesc = `Test dinner ${Date.now()}`;
  await page.getByPlaceholder("What was this expense for?").fill(uniqueDesc);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Create Expense" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const expenseCard = page
    .getByRole("button", { name: new RegExp(uniqueDesc) })
    .first();
  await expect(expenseCard).toBeVisible({ timeout: 10000 });
  const testId = await expenseCard.getAttribute("data-testid");
  const match = testId?.match(/expense-card-(\d+)/);
  if (!match) throw new Error("Could not extract expense ID from data-testid");
  return { expenseId: parseInt(match[1], 10), description: uniqueDesc };
}

async function openExpenseDetail(page: Page, _expenseId: number, description: string) {
  await page.goto("/expenses");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const expenseCard = page
    .getByRole("button", { name: new RegExp(description) })
    .first();
  await expect(expenseCard).toBeVisible({ timeout: 10000 });
  await expenseCard.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

test.describe("Expense Management", () => {
  test("View Details: clicking an expense opens a detail view showing the total, payer, and splits", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const { expenseId, description } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, expenseId, description);

    await expect(
      authPage.getByTestId("expense-split-details"),
    ).toBeVisible({ timeout: 15000 });
    await expect(authPage.getByText("€25.00").first()).toBeVisible();
    await expect(authPage.getByText("Paid by").first()).toBeVisible();
  });

  test("Edit Expense: changing the amount updates the record", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const { expenseId, description } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, expenseId, description);

    await expect(
      authPage.getByTestId("expense-edit-button"),
    ).toBeVisible({ timeout: 15000 });
    await authPage.getByTestId("expense-edit-button").click();
    await authPage.waitForFunction(
      () =>
        new URL(window.location.href).searchParams.get("action") === "edit",
      {},
      { timeout: 10000 },
    );

    await expect(
      authPage.getByTestId("expense-form-title"),
    ).toBeVisible({ timeout: 10000 });
    await expect(authPage.getByTestId("expense-form-title")).toContainText(
      "Edit Expense",
    );

    const amountInput = authPage.getByPlaceholder("0.00").first();
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("50.00");
    await authPage.getByRole("button", { name: "Next", exact: true }).click();
    await authPage.waitForLoadState("networkidle");
    await authPage.getByRole("button", { name: "Next", exact: true }).click();
    await authPage.waitForLoadState("networkidle");
    await authPage.getByRole("button", { name: "Update Expense" }).click();
    await authPage.waitForLoadState("networkidle");

    await expect(authPage.getByText("€50.00").first()).toBeVisible();
  });

  test("Delete Expense: deleting an expense removes it from the list", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const { expenseId, description: desc } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, expenseId, desc);

    await expect(
      authPage.getByTestId("expense-delete-button"),
    ).toBeVisible({ timeout: 15000 });
    await authPage.getByTestId("expense-delete-button").click();

    await expect(
      authPage.getByTestId("expense-delete-dialog"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      authPage.getByTestId("expense-delete-dialog").getByText("Delete Expense"),
    ).toBeVisible();

    await authPage
      .getByTestId("expense-delete-dialog")
      .getByRole("button", { name: "Delete" })
      .click();
    await authPage.waitForLoadState("networkidle");

    await expect(authPage.getByTestId("expense-delete-dialog")).not.toBeVisible();
    await expect(
      authPage.getByRole("button", { name: new RegExp(desc) }),
    ).not.toBeVisible();
  });
});
