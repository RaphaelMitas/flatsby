import { by, element, waitFor } from "detox";

import { selectExpenseCategory, selectSplitMethod } from "./categories";
import { fillInput, dismissKeyboard } from "./input";
import { tapIdUntilVisible, tapUntilVisible, tapWhenVisible, scrollToMatcher } from "./interaction";
import { goToExpenses } from "./navigation";

export async function ensurePaidBySelected(): Promise<void> {
  await scrollToMatcher(by.id("expense-form-paid-by-picker"));
  await tapUntilVisible(
    by.id("expense-form-paid-by-picker"),
    by.text("E2E Test User"),
    { timeout: 10_000, tapTimeout: 3_000, retries: 8 },
  );
  await element(by.text("E2E Test User")).atIndex(0).tap();
}

export async function fillExpenseAmount(amount: string): Promise<void> {
  await tapWhenVisible(by.id("expense-form-amount-input"));
  const input = element(by.id("expense-form-amount-input"));
  await input.replaceText(amount);
}

async function waitForExpensesScreenReady(): Promise<void> {
  await waitFor(element(by.id("expenses-debt-overview-button")))
    .toBeVisible()
    .withTimeout(15_000);

  try {
    await waitFor(element(by.text("Loading expenses...")))
      .not.toBeVisible()
      .withTimeout(15_000);
  } catch {
    // Screen may already be loaded.
  }
}

async function openAddExpenseForm(): Promise<void> {
  await goToExpenses();
  await waitForExpensesScreenReady();

  const addButtonIds = [
    "expenses-add-fab",
    "expenses-empty-add-button",
    "expenses-add-button",
  ] as const;

  for (const testId of addButtonIds) {
    try {
      await tapIdUntilVisible(testId, by.id("expense-form-step-indicator"), {
        timeout: 10_000,
        tapTimeout: 4_000,
        retries: 8,
      });
      return;
    } catch {
      // Try the next add entry point.
    }
  }

  throw new Error("Could not open add expense form");
}

async function scrollExpenseFormDown(): Promise<void> {
  const scrollViews = [by.type("RCTScrollView"), by.type("UIScrollView")];

  for (const scrollMatcher of scrollViews) {
    try {
      await element(scrollMatcher).atIndex(0).scroll(400, "down");
      await element(scrollMatcher).atIndex(0).scroll(400, "down");
      return;
    } catch {
      // Try the next scroll container type.
    }
  }
}

export async function openExpenseForm(options: {
  amount: string;
  description: string;
  categoryId?: string;
}): Promise<void> {
  await openAddExpenseForm();
  await fillExpenseAmount(options.amount);
  await dismissKeyboard();
  await fillInput("expense-form-description-input", options.description);
  await dismissKeyboard();
  await scrollExpenseFormDown();

  if (options.categoryId) {
    await selectExpenseCategory(options.categoryId);
  }
}

export async function submitEqualSplitExpense(): Promise<void> {
  await dismissKeyboard();
  await scrollExpenseFormDown();
  await dismissKeyboard();
  await waitFor(element(by.id("expense-form-next-button")))
    .toBeVisible()
    .withTimeout(15_000);

  await tapUntilVisible(
    by.id("expense-form-next-button"),
    by.text("Step 2 of 3"),
    { timeout: 15_000 },
  );
  await tapUntilVisible(
    by.id("expense-form-next-button"),
    by.text("Step 3 of 3"),
    { timeout: 15_000 },
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
  categoryId?: string;
}): Promise<string> {
  await openExpenseForm(options);
  await submitEqualSplitExpense();
  await waitFor(element(by.text(options.description)))
    .toBeVisible()
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

export { selectSplitMethod };
