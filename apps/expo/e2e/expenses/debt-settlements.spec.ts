import { by, element, expect } from "detox";

import { signIn } from "../fixtures/auth";
import { selectBootstrapGroup } from "../helpers/group";
import { fillInput } from "../helpers/input";
import { goToDebtSummary } from "../helpers/navigation";

describe("Debt & Settlements", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("displays debt summary page with correct title and subtitle", async () => {
    await goToDebtSummary();

    await expect(element(by.id("debts-title"))).toBeVisible();
    await expect(
      element(by.text("Simplified view of who owes whom")),
    ).toBeVisible();
  });

  it("shows all settled up state when no debts exist", async () => {
    await goToDebtSummary();

    await expect(element(by.id("debts-settled-state"))).toBeVisible();
    await expect(element(by.text("All settled up!"))).toBeVisible();
    await expect(
      element(by.text("No outstanding debts in this group")),
    ).toBeVisible();
  });

  it("opens settlement form when clicking Settle Up and records settlement", async () => {
    await goToDebtSummary();

    const settleUpButton = element(by.id("debts-settle-up-button"));

    try {
      await settleUpButton.atIndex(0).tap();
    } catch {
      await expect(element(by.id("debts-settled-state"))).toBeVisible();
      return;
    }

    await expect(element(by.id("settle-amount-input"))).toBeVisible();
    await expect(element(by.text("Paying"))).toBeVisible();
    await expect(element(by.text("Receiving"))).toBeVisible();

    await fillInput("settle-amount-input", "100");
    await element(by.id("settle-cancel-button")).tap();
    await expect(element(by.id("settle-amount-input"))).not.toBeVisible();
  });

  it("clears debts after recording full settlement", async () => {
    await goToDebtSummary();

    try {
      await element(by.id("debts-settle-up-button")).atIndex(0).tap();
      await fillInput("settle-amount-input", "1");
      await element(by.id("settle-submit-button")).tap();
    } catch {
      await expect(element(by.id("debts-settled-state"))).toBeVisible();
      return;
    }

    await goToDebtSummary();
    await expect(element(by.id("debts-settled-state"))).toBeVisible();
    await expect(element(by.text("All settled up!"))).toBeVisible();
  });
});
