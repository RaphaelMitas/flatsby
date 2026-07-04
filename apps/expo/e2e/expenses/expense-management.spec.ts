import { by, element, expect, waitFor } from "detox";

import { signIn } from "../fixtures/auth";
import { createTestExpense, openExpenseDetail } from "../helpers/expenses";
import { selectBootstrapGroup } from "../helpers/group";
import { fillInput } from "../helpers/input";

describe("Expense Management", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("View Details: clicking an expense opens a detail view showing the total, payer, and splits", async () => {
    const { description } = await createTestExpense();
    await openExpenseDetail(description);

    await expect(element(by.id("expense-split-details"))).toBeVisible();
    await expect(element(by.text("€25.00"))).toBeVisible();
    await expect(element(by.text("Paid by"))).toBeVisible();
  });

  it("Edit Expense: changing the amount updates the record", async () => {
    const { description } = await createTestExpense();
    await openExpenseDetail(description);

    await expect(element(by.id("expense-edit-button"))).toBeVisible();
    await element(by.id("expense-edit-button")).tap();

    await waitFor(element(by.id("expense-form-step-indicator")))
      .toBeVisible()
      .withTimeout(10_000);

    await fillInput("expense-form-amount-input", "50.00");
    await element(by.id("expense-form-next-button")).tap();
    await element(by.id("expense-form-next-button")).tap();
    await element(by.id("expense-form-submit-button")).tap();

    await expect(element(by.text("€50.00"))).toBeVisible();
  });

  it("Delete Expense: deleting an expense removes it from the list", async () => {
    const { description } = await createTestExpense();
    await openExpenseDetail(description);

    await element(by.id("expense-delete-button")).tap();
    await waitFor(element(by.id("delete-confirmation-modal")))
      .toBeVisible()
      .withTimeout(10_000);
    await element(by.id("delete-confirmation-button")).tap();

    await waitFor(element(by.text(description)))
      .not.toBeVisible()
      .withTimeout(15_000);
  });
});
