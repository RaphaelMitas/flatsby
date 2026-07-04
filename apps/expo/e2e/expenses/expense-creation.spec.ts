import { by, element, expect, waitFor } from "detox";

import { signIn } from "../fixtures/auth";
import { selectSplitMethod } from "../helpers/categories";
import {
  createEqualSplitExpense,
  fillFirstSplitMemberAmount,
  openExpenseForm,
  submitEqualSplitExpense,
} from "../helpers/expenses";
import { selectBootstrapGroup } from "../helpers/group";

describe("Expense Creation", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("creates an expense with equal split", async () => {
    const description = "Groceries";
    await createEqualSplitExpense({
      amount: "25.00",
      description,
      categoryId: "groceries",
    });

    await expect(element(by.text("€25.00"))).toBeVisible();
    await expect(element(by.text(description))).toBeVisible();
  });

  it("creates an expense with percentage split", async () => {
    await openExpenseForm({
      amount: "100.00",
      description: "Dinner split by percentage",
      categoryId: "restaurant",
    });

    await element(by.id("expense-form-next-button")).tap();
    await expect(element(by.text("Step 2 of 3"))).toBeVisible();

    await selectSplitMethod("percentage");
    await fillFirstSplitMemberAmount("100");

    await element(by.id("expense-form-next-button")).tap();
    await expect(element(by.text("Step 3 of 3"))).toBeVisible();
    await expect(element(by.text("€100.00"))).toBeVisible();

    await element(by.id("expense-form-submit-button")).tap();

    await expect(element(by.text("€100.00"))).toBeVisible();
    await expect(element(by.text("Dinner split by percentage"))).toBeVisible();
  });

  it("creates an expense with custom amount split", async () => {
    await openExpenseForm({
      amount: "30.00",
      description: "Rent utilities custom split",
      categoryId: "other-housing",
    });

    await element(by.id("expense-form-next-button")).tap();
    await expect(element(by.text("Step 2 of 3"))).toBeVisible();

    await selectSplitMethod("custom");
    await fillFirstSplitMemberAmount("3000");

    await element(by.id("expense-form-next-button")).tap();
    await expect(element(by.text("Step 3 of 3"))).toBeVisible();
    await expect(element(by.text("€30.00"))).toBeVisible();

    await element(by.id("expense-form-submit-button")).tap();

    await expect(element(by.text("€30.00"))).toBeVisible();
    await expect(element(by.text("Rent utilities custom split"))).toBeVisible();
  });

  it("creates an expense with manual category selection", async () => {
    await openExpenseForm({
      amount: "15.00",
      description: "Coffee with friends",
      categoryId: "coffee",
    });

    await submitEqualSplitExpense();

    await expect(element(by.text("€15.00"))).toBeVisible();
    await expect(element(by.text("Coffee with friends"))).toBeVisible();
  });
});
