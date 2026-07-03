import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";
import { selectExpenseCategory } from "../helpers/categories";

async function createTestExpenseViaAPI(
  page: Page,
  amountDecimal: string,
  description: string,
): Promise<string> {
  await page.goto("/expenses");

  await page.getByTestId("expense-add-button").click();

  const amountInput = page.getByTestId("expense-form-amount");
  await amountInput.click();
  await amountInput.clear();
  await amountInput.pressSequentially(amountDecimal);

  const paidByTrigger = page.getByTestId("expense-form-paid-by");
  const paidByText = (await paidByTrigger.allTextContents())[0]?.trim();
  if (paidByText === "") {
    await paidByTrigger.click();
    await page.getByRole("option").first().click();
  }

  const descInput = page.getByTestId("expense-form-description");
  await descInput.fill(description);

  await selectExpenseCategory(page, "groceries");

  await page.getByTestId("expense-form-next").click();

  await page.getByTestId("expense-form-next").click();

  await page.getByTestId("expense-form-submit").click();

  return description;
}

test.describe("Expense Creation", () => {
  test("creates an expense with equal split", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses");
    await expect(authPage.getByTestId("expense-heading")).toBeVisible();

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
    await authPage.getByTestId("expense-add-button").click();
    await expect(authPage.getByText("Add Expense")).toBeVisible();

    const amountInput = authPage.getByTestId("expense-form-amount");
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("100.00");

    const paidByTrigger = authPage.getByTestId("expense-form-paid-by");
    if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
      await paidByTrigger.click();
      await authPage.getByRole("option").first().click();
    }

    const descInput = authPage.getByTestId("expense-form-description");
    await descInput.fill("Dinner split by percentage");

    await selectExpenseCategory(authPage, "restaurant");

    await authPage.getByTestId("expense-form-next").click();
    await expect(authPage.getByTestId("expense-form-step")).toContainText(
      "Step 2/3",
    );

    await authPage.getByTestId("split-method-percentage").click();

    const splitDetailsCard = authPage.getByTestId("split-details-card");
    const percentInputs = splitDetailsCard.getByTestId(/^split-member-amount-/);
    const count = await percentInputs.count();
    if (count >= 1) {
      await percentInputs.first().click();
      await percentInputs.first().clear();
      await percentInputs.first().pressSequentially("100");
    }

    await authPage.getByTestId("expense-form-next").click();
    await expect(authPage.getByTestId("expense-form-step")).toContainText(
      "Step 3/3",
    );

    await expect(authPage.getByText("€100.00").first()).toBeVisible();

    await authPage.getByTestId("expense-form-submit").click();

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
    await authPage.getByTestId("expense-add-button").click();
    await expect(authPage.getByText("Add Expense")).toBeVisible();

    const amountInput = authPage.getByTestId("expense-form-amount");
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("30.00");

    const paidByTrigger = authPage.getByTestId("expense-form-paid-by");
    if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
      await paidByTrigger.click();
      await authPage.getByRole("option").first().click();
    }

    const descInput = authPage.getByTestId("expense-form-description");
    await descInput.fill("Rent utilities custom split");

    await selectExpenseCategory(authPage, "other-housing");

    await authPage.getByTestId("expense-form-next").click();
    await expect(authPage.getByTestId("expense-form-step")).toContainText(
      "Step 2/3",
    );

    await authPage.getByTestId("split-method-custom").click();

    const splitDetailsCard = authPage.getByTestId("split-details-card");
    const customInputs = splitDetailsCard.getByTestId(/^split-member-amount-/);
    const count = await customInputs.count();
    if (count >= 1) {
      await customInputs.first().click();
      await customInputs.first().clear();
      await customInputs.first().pressSequentially("3000");
    }

    await authPage.getByTestId("expense-form-next").click();
    await expect(authPage.getByTestId("expense-form-step")).toContainText(
      "Step 3/3",
    );

    await expect(authPage.getByText("€30.00").first()).toBeVisible();

    await authPage.getByTestId("expense-form-submit").click();

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
    await authPage.getByTestId("expense-add-button").click();
    await expect(authPage.getByText("Add Expense")).toBeVisible();

    const amountInput = authPage.getByTestId("expense-form-amount");
    await amountInput.click();
    await amountInput.clear();
    await amountInput.pressSequentially("15.00");

    const paidByTrigger = authPage.getByTestId("expense-form-paid-by");
    if ((await paidByTrigger.allTextContents())[0]?.trim() === "") {
      await paidByTrigger.click();
      await authPage.getByRole("option").first().click();
    }

    const descInput = authPage.getByTestId("expense-form-description");
    await descInput.fill("Coffee with friends");

    await selectExpenseCategory(authPage, "coffee");

    await authPage.getByTestId("expense-form-next").click();

    await authPage.getByTestId("expense-form-next").click();

    await expect(authPage.getByText("€15.00").first()).toBeVisible();

    await authPage.getByTestId("expense-form-submit").click();

    await expect(authPage.getByText("€15.00").first()).toBeVisible();
    await expect(
      authPage.getByText("Coffee with friends").first(),
    ).toBeVisible();
  });
});
