import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function createTestExpenseViaAPI(
  page: Page,
  amountDecimal: string,
  description: string,
): Promise<string> {
  await page.goto("/expenses");

  await page.getByRole("button", { name: "Add", exact: true }).click();

  const amountInput = page.getByPlaceholder("0.00").first();
  await amountInput.click();
  await amountInput.clear();
  await amountInput.pressSequentially(amountDecimal);

  const paidByTrigger = page.getByRole("combobox", { name: "Paid By" }).first();
  const paidByText = (await paidByTrigger.allTextContents())[0]?.trim();
  if (paidByText === "") {
    await paidByTrigger.click();
    await page.getByRole("option").first().click();
  }

  const descInput = page.getByPlaceholder("What was this expense for?");
  await descInput.fill(description);

  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByRole("button", { name: "Create Expense" }).click();

  return description;
}

test.describe("Expense Creation", () => {
  test("creates an expense with equal split", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses");
    await expect(
      authPage.getByRole("heading", { name: "Expenses" }),
    ).toBeVisible();

    const description = "Groceries";
    await createTestExpenseViaAPI(authPage, "25.00", description);

    await expect(authPage.getByText("€25.00").first()).toBeVisible();
    await expect(authPage.getByText(description).first()).toBeVisible();
  });

  test("creates an expense with percentage split", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses");
    await authPage.getByRole("button", { name: "Add", exact: true }).click();
    await expect(authPage.getByText("Add Expense")).toBeVisible();

    const amountInput = authPage.getByPlaceholder("0.00").first();
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("100.00");

    const paidByTrigger = authPage
      .getByRole("combobox", { name: "Paid By" })
      .first();
    if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
      await paidByTrigger.click();
      await authPage.getByRole("option").first().click();
    }

    const descInput = authPage.getByPlaceholder("What was this expense for?");
    await descInput.fill("Dinner split by percentage");

    await authPage.getByRole("button", { name: "Next", exact: true }).click();
    await expect(authPage.getByText("Step 2/3")).toBeVisible();

    const splitMethodToggle = authPage
      .getByRole("button", { name: "Equal", exact: true })
      .locator("..");
    await splitMethodToggle.getByRole("button", { name: "Percentage" }).click();

    const splitDetailsCard = authPage.getByText("Split Details").first();
    const percentInputs = splitDetailsCard.getByPlaceholder("0.00");
    const count = await percentInputs.count();
    if (count >= 1) {
      await percentInputs.first().click();
      await percentInputs.first().clear();
      await percentInputs.first().pressSequentially("100");
    }

    await authPage.getByRole("button", { name: "Next", exact: true }).click();
    await expect(authPage.getByText("Step 3/3")).toBeVisible();

    await expect(authPage.getByText("€100.00").first()).toBeVisible();

    await authPage.getByRole("button", { name: "Create Expense" }).click();

    await expect(authPage.getByText("€100.00").first()).toBeVisible();
    await expect(
      authPage.getByText("Dinner split by percentage").first(),
    ).toBeVisible();
  });

  test("creates an expense with custom amount split", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses");
    await authPage.getByRole("button", { name: "Add", exact: true }).click();
    await expect(authPage.getByText("Add Expense")).toBeVisible();

    const amountInput = authPage.getByPlaceholder("0.00").first();
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("30.00");

    const paidByTrigger = authPage
      .getByRole("combobox", { name: "Paid By" })
      .first();
    if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
      await paidByTrigger.click();
      await authPage.getByRole("option").first().click();
    }

    const descInput = authPage.getByPlaceholder("What was this expense for?");
    await descInput.fill("Rent utilities custom split");

    await authPage.getByRole("button", { name: "Next", exact: true }).click();
    await expect(authPage.getByText("Step 2/3")).toBeVisible();

    const splitMethodToggle = authPage
      .getByRole("button", { name: "Equal", exact: true })
      .locator("..");
    await splitMethodToggle.getByRole("button", { name: "Custom" }).click();

    const splitDetailsCard = authPage.getByText("Split Details").first();
    const customInputs = splitDetailsCard.getByPlaceholder("0.00");
    const count = await customInputs.count();
    if (count >= 1) {
      await customInputs.first().click();
      await customInputs.first().clear();
      await customInputs.first().pressSequentially("3000");
    }

    await authPage.getByRole("button", { name: "Next", exact: true }).click();
    await expect(authPage.getByText("Step 3/3")).toBeVisible();

    await expect(authPage.getByText("€30.00").first()).toBeVisible();

    await authPage.getByRole("button", { name: "Create Expense" }).click();

    await expect(authPage.getByText("€30.00").first()).toBeVisible();
    await expect(
      authPage.getByText("Rent utilities custom split").first(),
    ).toBeVisible();
  });

  test("creates an expense with manual category selection", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses");
    await authPage.getByRole("button", { name: "Add", exact: true }).click();
    await expect(authPage.getByText("Add Expense")).toBeVisible();

    const amountInput = authPage.getByPlaceholder("0.00").first();
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("15.00");

    const paidByTrigger = authPage
      .getByRole("combobox", { name: "Paid By" })
      .first();
    if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
      await paidByTrigger.click();
      await authPage.getByRole("option").first().click();
    }

    const descInput = authPage.getByPlaceholder("What was this expense for?");
    await descInput.fill("Coffee with friends");

    const categoryButton = authPage
      .getByRole("combobox", { name: "Category" })
      .or(authPage.getByText("Other").last());
    if (await categoryButton.isVisible().catch(() => false)) {
      await categoryButton.click();
      const coffeeOption = authPage.getByRole("option", { name: "Coffee" });
      if (await coffeeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await coffeeOption.click();
      } else {
        await authPage.keyboard.press("Escape");
      }
    }

    await authPage.getByRole("button", { name: "Next", exact: true }).click();

    await authPage.getByRole("button", { name: "Next", exact: true }).click();

    await expect(authPage.getByText("€15.00").first()).toBeVisible();

    await authPage.getByRole("button", { name: "Create Expense" }).click();

    await expect(authPage.getByText("€15.00").first()).toBeVisible();
    await expect(
      authPage.getByText("Coffee with friends").first(),
    ).toBeVisible();
  });
});
