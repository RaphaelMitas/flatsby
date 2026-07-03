import { expect, test } from "../fixtures/auth";
import { createTestExpense, openExpenseDetail } from "../helpers/expenses";

test.describe("Expense Management", () => {
  test("View Details: clicking an expense opens a detail view showing the total, payer, and splits", async ({
    authPage,
  }) => {
    const { description } = await createTestExpense(authPage);
    await openExpenseDetail(authPage, description);

    await expect(authPage.getByTestId("expense-split-details")).toBeVisible({
      timeout: 15000,
    });
    await expect(authPage.getByText("€25.00").first()).toBeVisible();
    await expect(authPage.getByText("Paid by").first()).toBeVisible();
  });

  test("Edit Expense: changing the amount updates the record", async ({
    authPage,
  }) => {
    const { description } = await createTestExpense(authPage);
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
  }) => {
    const { description: desc } = await createTestExpense(authPage);
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
