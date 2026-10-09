import { expect, test } from "../fixtures/auth";
import {
  createEqualSplitExpense,
  fillExpenseAmount,
  openExpenseDetail,
  openExpenseForm,
  submitEqualSplitExpense,
} from "../helpers/expenses";

test.describe("Expense Creation", () => {
  test("creates an expense with equal split", async ({ authPage }) => {
    await authPage.goto("/expenses");
    await expect(authPage.getByTestId("expense-heading")).toBeVisible();

    const description = "Groceries";
    await createEqualSplitExpense(authPage, {
      amount: "25.00",
      description,
      categoryId: "groceries",
    });

    await expect(authPage.getByText("€25.00").first()).toBeVisible();
    await expect(authPage.getByText(description).first()).toBeVisible();
  });

  test("creates an expense with percentage split", async ({ authPage }) => {
    await authPage.goto("/expenses");
    await openExpenseForm(authPage, {
      amount: "100.00",
      description: "Dinner split by percentage",
      categoryId: "restaurant",
    });

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

  test("creates and edits an expense with shares split", async ({
    authPage,
  }) => {
    await authPage.goto("/expenses");
    await openExpenseForm(authPage, {
      amount: "90.00",
      description: "Groceries split by shares",
      categoryId: "groceries",
    });

    await authPage.getByTestId("expense-form-next").click();
    await expect(authPage.getByTestId("expense-form-step")).toContainText(
      "Step 2/3",
    );

    await authPage.getByTestId("split-method-shares").click();

    const splitDetailsCard = authPage.getByTestId("split-details-card");
    const incrementButtons = splitDetailsCard.getByTestId(
      /^split-member-shares-increment-/,
    );
    await incrementButtons.first().click();
    await expect(
      splitDetailsCard.getByTestId(/^split-member-shares-\d+$/).first(),
    ).toHaveValue("2");

    await authPage.getByTestId("expense-form-next").click();
    await expect(authPage.getByTestId("expense-form-step")).toContainText(
      "Step 3/3",
    );

    await authPage.getByTestId("expense-form-submit").click();

    await expect(authPage.getByText("€90.00").first()).toBeVisible();
    await expect(
      authPage.getByText("Groceries split by shares").first(),
    ).toBeVisible();

    await expect(authPage.getByTestId("expense-form-title")).not.toBeVisible({
      timeout: 15000,
    });
    await openExpenseDetail(authPage, "Groceries split by shares");
    await expect(authPage.getByTestId("expense-split-details")).toContainText(
      "2 of 2 shares",
    );

    // The created toast sits over the form's Next button until it expires
    await expect(authPage.getByText("Expense created successfully")).toBeHidden(
      { timeout: 10000 },
    );
    await authPage.getByTestId("expense-edit-button").click();
    await expect(authPage.getByTestId("expense-form-title")).toContainText(
      "Edit Expense",
    );
    await fillExpenseAmount(authPage, "60.00");
    await authPage.getByTestId("expense-form-next").click();
    await expect(
      splitDetailsCard.getByTestId(/^split-member-shares-\d+$/).first(),
    ).toHaveValue("2");
    await expect(splitDetailsCard).toContainText("€60.00");

    await authPage.getByTestId("expense-form-next").click();
    await authPage.getByTestId("expense-form-submit").click();
    await expect(authPage.getByTestId("expense-form-title")).not.toBeVisible({
      timeout: 15000,
    });
    // Reload so the detail view reads the saved expense, not the optimistic cache
    await authPage.reload();
    await openExpenseDetail(authPage, "Groceries split by shares");
    await expect(authPage.getByTestId("expense-split-details")).toContainText(
      "2 of 2 shares",
    );
    await expect(authPage.getByTestId("expense-split-details")).toContainText(
      "€60.00",
    );
  });

  test("creates an expense with custom amount split", async ({ authPage }) => {
    await authPage.goto("/expenses");
    await openExpenseForm(authPage, {
      amount: "30.00",
      description: "Rent utilities custom split",
      categoryId: "other-housing",
    });

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
  }) => {
    await authPage.goto("/expenses");
    await openExpenseForm(authPage, {
      amount: "15.00",
      description: "Coffee with friends",
      categoryId: "coffee",
    });

    await submitEqualSplitExpense(authPage);

    await expect(authPage.getByText("€15.00").first()).toBeVisible();
    await expect(
      authPage.getByText("Coffee with friends").first(),
    ).toBeVisible();
  });
});
