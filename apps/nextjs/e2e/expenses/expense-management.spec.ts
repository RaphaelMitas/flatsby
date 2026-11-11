import { expect, test } from "../fixtures/auth";
import {
  createTestExpense,
  fillExpenseAmount,
  openExpenseDetail,
  openExpenseEdit,
  submitEqualSplitExpense,
} from "../helpers/expenses";

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

    await openExpenseEdit(authPage);
    await fillExpenseAmount(authPage, "50.00");
    await submitEqualSplitExpense(authPage);

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

  test("Search and filter: text and a category narrow the list, a miss shows the empty state", async ({
    authPage,
  }) => {
    const { description } = await createTestExpense(authPage);
    const card = authPage
      .getByTestId(/^expense-card-\d+$/)
      .filter({ hasText: description });
    const search = authPage.getByTestId("expense-search-input");

    await search.fill(description.toUpperCase());
    await expect(card).toBeVisible();

    await authPage.getByTestId("expense-filter-category").click();
    await authPage.getByTestId("expense-filter-category-food-drinks").click();
    await expect(card).toBeVisible();

    await authPage.getByTestId("expense-filter-category").click();
    await authPage.getByTestId("expense-filter-category-housing").click();
    await expect(authPage.getByTestId("expense-search-empty")).toBeVisible();
    await expect(card).not.toBeVisible();

    await authPage.getByTestId("expense-search-reset").click();
    await expect(search).toHaveValue("");
    await expect(card).toBeVisible();
  });

  test("Search survives opening a result on a narrow screen", async ({
    authPage,
  }) => {
    await authPage.setViewportSize({ width: 390, height: 844 });
    const { description } = await createTestExpense(authPage);
    const search = authPage.getByTestId("expense-search-input");
    await search.fill(description);
    await openExpenseDetail(authPage, description);
    await expect(authPage.getByTestId("expense-split-details")).toBeVisible({
      timeout: 15000,
    });

    await authPage.goBack();
    await expect(search).toHaveValue(description);
  });
});
