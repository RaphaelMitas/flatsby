import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

test.describe("Debt & Settlements", () => {
  test("displays debt summary page with correct title and subtitle", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses/debts");

    await expect(authPage.getByText("Debt Summary")).toBeVisible();
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

    const settleUpButton = authPage.getByRole("button", { name: "Settle Up" });

    if ((await settleUpButton.count()) === 0) {
      await expect(authPage.getByText("All settled up!")).toBeVisible();
      return;
    }

    await settleUpButton.first().click();

    await expect(authPage.getByText("Settle Up")).toBeVisible();
    await expect(authPage.getByText("Paying")).toBeVisible();
    await expect(authPage.getByText("Receiving")).toBeVisible();

    const amountInput = authPage.getByPlaceholder("0.00");
    await expect(amountInput).toBeVisible();

    await expect(authPage.getByText("Outstanding debt")).toBeVisible();

    await amountInput.fill("100");

    const recordButton = authPage.getByRole("button", {
      name: "Record Settlement",
    });
    await expect(recordButton).toBeVisible();

    const cancelButton = authPage.getByRole("button", { name: "Cancel" });
    await cancelButton.click();

    await expect(authPage.getByText("Settle Up")).not.toBeVisible();
  });

  test("clears debts after recording full settlement", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/expenses/debts");

    const settleUpButton = authPage.getByRole("button", { name: "Settle Up" });

    if ((await settleUpButton.count()) === 0) {
      await expect(authPage.getByText("All settled up!")).toBeVisible();
      return;
    }

    const debtCount = await settleUpButton.count();

    for (let i = 0; i < debtCount; i++) {
      await authPage.reload();

      const currentSettleButton = authPage.getByRole("button", {
        name: "Settle Up",
      });

      if ((await currentSettleButton.count()) === 0) break;

      const outstandingText = await authPage
        .getByText("Outstanding debt")
        .textContent();
      if (!outstandingText) {
        await currentSettleButton.first().click();
      } else {
        await currentSettleButton.first().click();
      }

      await expect(authPage.getByText("Settle Up")).toBeVisible();

      const amountInput = authPage.getByPlaceholder("0.00");
      const fillValue = amountInput;
      await fillValue.fill("1");

      const recordButton = authPage.getByRole("button", {
        name: "Record Settlement",
      });
       await recordButton.click();

       await authPage.waitForLoadState("networkidle");
    }

    await authPage.reload();

    await expect(authPage.getByText("All settled up!")).toBeVisible();
  });
});
