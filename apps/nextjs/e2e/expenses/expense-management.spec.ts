import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function createTestExpense(page: Page): Promise<string> {
  await page.goto("/expenses");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForLoadState("networkidle");

  const amountInput = page.getByPlaceholder("0.00").first();
  await amountInput.click();
  await amountInput.clear();
  await amountInput.pressSequentially("25.00");

  const paidByTrigger = page.getByRole("combobox", { name: "Paid By" }).first();
  if ((await paidByTrigger.allTextContents())[0].trim() === "") {
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

  return uniqueDesc;
}

test.describe("Expense Management", () => {
  test("View Details: clicking an expense opens a detail view showing the total, payer, and splits", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const description = await createTestExpense(authPage);

    await expect(authPage.getByText(description).first()).toBeVisible();

    const expenseCard = authPage
      .getByRole("button", { name: new RegExp(description) })
      .first();
    await expenseCard.focus();
    await expenseCard.click();
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(1500);

    await expect(authPage.getByText("€25.00").first()).toBeVisible();
    await expect(authPage.getByText("Paid by").first()).toBeVisible();
    await expect(authPage.getByText("Split Details").first()).toBeVisible();
  });

  test("Edit Expense: changing the amount updates the record", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const description = await createTestExpense(authPage);

    const expenseCard = authPage
      .getByRole("button", { name: new RegExp(description) })
      .first();
    await expenseCard.focus();
    await expenseCard.click();
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(1500);

    await authPage.getByRole("button", { name: "Edit" }).click();
    await authPage.waitForLoadState("networkidle");

    await expect(authPage.getByText("Edit Expense")).toBeVisible();

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
    const description = await createTestExpense(authPage);

    const expenseCard = authPage
      .getByRole("button", { name: new RegExp(description) })
      .first();
    await expenseCard.focus();
    await expenseCard.click();
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(1500);

    await authPage.getByRole("button", { name: "Delete" }).click();

    const dialog = authPage
      .getByRole("alertdialog")
      .or(authPage.getByRole("dialog"));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Delete Expense")).toBeVisible();
    await expect(
      dialog.getByText(
        "Are you sure you want to delete this expense? This action cannot be undone.",
      ),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Delete" }).click();
    await authPage.waitForLoadState("networkidle");

    await expect(dialog).not.toBeVisible();
    await expect(
      authPage.getByRole("button", { name: new RegExp(description) }),
    ).not.toBeVisible();
  });
});
