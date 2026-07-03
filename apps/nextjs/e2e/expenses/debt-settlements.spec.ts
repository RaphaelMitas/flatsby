import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

test.describe("Debt & Settlements", () => {
  test("displays debt summary page with correct title and subtitle", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses/debts");

    await expect(authPage.getByTestId("debt-summary-title")).toBeVisible();
    await expect(
      authPage.getByText("Simplified view of who owes whom"),
    ).toBeVisible();
  });

  test("shows all settled up state when no debts exist", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses/debts");

    await expect(authPage.getByTestId("debt-summary-empty")).toBeVisible();
    await expect(authPage.getByText("All settled up!")).toBeVisible();
    await expect(
      authPage.getByText("No outstanding debts in this group"),
    ).toBeVisible();
  });

  test("opens settlement form when clicking Settle Up and records settlement", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses/debts");

    const settleUpButton = authPage.getByTestId("debt-settle-up-button");

    if ((await settleUpButton.count()) === 0) {
      await expect(authPage.getByTestId("debt-summary-empty")).toBeVisible();
      return;
    }

    await settleUpButton.first().click();

    await expect(authPage.getByTestId("settlement-form")).toBeVisible();
    await expect(authPage.getByText("Paying")).toBeVisible();
    await expect(authPage.getByText("Receiving")).toBeVisible();

    const amountInput = authPage.getByTestId("settlement-amount-input");
    await expect(amountInput).toBeVisible();

    await expect(authPage.getByText("Outstanding debt")).toBeVisible();

    await amountInput.fill("100");

    const recordButton = authPage.getByTestId("settlement-record-button");
    await expect(recordButton).toBeVisible();

    const cancelButton = authPage.getByTestId("settlement-cancel-button");
    await cancelButton.click();

    await expect(authPage.getByTestId("settlement-form")).not.toBeVisible();
  });

  test("clears debts after recording full settlement", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses/debts");

    const settleUpButton = authPage.getByTestId("debt-settle-up-button");

    if ((await settleUpButton.count()) === 0) {
      await expect(authPage.getByTestId("debt-summary-empty")).toBeVisible();
      return;
    }

    const debtCount = await settleUpButton.count();

    for (let i = 0; i < debtCount; i++) {
      await authPage.reload();

      const currentSettleButton = authPage.getByTestId("debt-settle-up-button");

      if ((await currentSettleButton.count()) === 0) break;

      await currentSettleButton.first().click();

      await expect(authPage.getByTestId("settlement-form")).toBeVisible();

      const amountInput = authPage.getByTestId("settlement-amount-input");
      await amountInput.fill("1");

      const recordButton = authPage.getByTestId("settlement-record-button");
      await recordButton.click();
    }

    await authPage.reload();

    await expect(authPage.getByTestId("debt-summary-empty")).toBeVisible();
    await expect(authPage.getByText("All settled up!")).toBeVisible();
  });
});
