import { by, element, waitFor } from "detox";

import { selectExpenseCategory, selectSplitMethod } from "./categories";
import { fillInput } from "./input";
import { tapIdUntilVisible, tapUntilVisible } from "./interaction";
import { goToExpenses } from "./navigation";

export async function ensurePaidBySelected(): Promise<void> {
  await element(by.id("expense-form-paid-by-picker")).tap();
  try {
    await element(by.id(/^picker-option-\d+$/))
      .atIndex(0)
      .tap();
  } catch {
    await element(by.text("E2E Test User")).atIndex(0).tap();
  }
}

export async function fillExpenseAmount(amount: string): Promise<void> {
  const input = element(by.id("expense-form-amount-input"));
  await input.tap();
  await input.replaceText(amount);
}

async function openAddExpenseForm(): Promise<void> {
  await goToExpenses();
  try {
    await tapIdUntilVisible(
      "expenses-add-fab",
      by.id("expense-form-step-indicator"),
      { timeout: 10_000 },
    );
  } catch {
    await tapIdUntilVisible(
      "expenses-empty-add-button",
      by.id("expense-form-step-indicator"),
      { timeout: 10_000 },
    );
  }
}

export async function openExpenseForm(options: {
  amount: string;
  description: string;
  categoryId: string;
}): Promise<void> {
  await openAddExpenseForm();
  await fillExpenseAmount(options.amount);
  await ensurePaidBySelected();
  await fillInput("expense-form-description-input", options.description);
  await selectExpenseCategory(options.categoryId);
}

export async function submitEqualSplitExpense(): Promise<void> {
  await tapUntilVisible(
    by.id("expense-form-next-button"),
    by.text("Step 2 of 3"),
    { timeout: 10_000 },
  );
  await tapUntilVisible(
    by.id("expense-form-next-button"),
    by.text("Step 3 of 3"),
    { timeout: 10_000 },
  );
  await tapUntilVisible(
    by.id("expense-form-submit-button"),
    by.text("Expenses"),
    { timeout: 15_000 },
  );
}

export async function createEqualSplitExpense(options: {
  amount: string;
  description: string;
  categoryId: string;
}): Promise<string> {
  await openExpenseForm(options);
  await submitEqualSplitExpense();
  await waitFor(element(by.text(options.description)))
    .toExist()
    .withTimeout(15_000);
  return options.description;
}

export async function createTestExpense(): Promise<{
  description: string;
}> {
  const uniqueDesc = `Test dinner ${Date.now()}`;
  await createEqualSplitExpense({
    amount: "25.00",
    description: uniqueDesc,
    categoryId: "restaurant",
  });
  return { description: uniqueDesc };
}

export async function openExpenseDetail(description: string): Promise<void> {
  await tapUntilVisible(by.text(description), by.id("expense-delete-button"), {
    timeout: 15_000,
  });
}

export async function fillFirstSplitMemberAmount(
  amount: string,
): Promise<void> {
  const input = element(by.id(/^split-member-amount-\d+$/)).atIndex(0);
  await input.tap();
  await input.replaceText(amount);
}
