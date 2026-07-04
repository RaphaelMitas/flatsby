import { by, element, expect, waitFor } from "detox";

import { getTestUserEmail, signIn } from "../fixtures/auth";
import { selectBootstrapGroup } from "../helpers/group";
import { fillInput } from "../helpers/input";
import { tapIdUntilVisible } from "../helpers/interaction";
import { goToDangerZone } from "../helpers/navigation";

describe("Account Management", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("access account deletion settings", async () => {
    await goToDangerZone();

    await expect(element(by.id("danger-delete-account-button"))).toBeVisible();
    await expect(
      element(by.text("This action cannot be undone.")),
    ).toBeVisible();
    await expect(element(by.text("Delete Account"))).toBeVisible();
  });

  it("two-step email confirmation", async () => {
    await goToDangerZone();

    await tapIdUntilVisible(
      "danger-delete-account-button",
      by.id("danger-confirmation-input"),
      { timeout: 10_000 },
    );

    await expect(element(by.id("danger-confirmation-input"))).toBeVisible();
    await expect(element(by.id("danger-cancel-button"))).toBeVisible();
    await expect(element(by.id("danger-confirm-delete-button"))).toBeVisible();

    await fillInput("danger-confirmation-input", "wrong-email@test.com");

    const email = await getTestUserEmail();
    await fillInput("danger-confirmation-input", email);
    await expect(element(by.id("danger-confirm-delete-button"))).toBeVisible();
  });

  it("delete account signs out and redirects", async () => {
    await goToDangerZone();

    await tapIdUntilVisible(
      "danger-delete-account-button",
      by.id("danger-confirmation-input"),
      { timeout: 10_000 },
    );
    const email = await getTestUserEmail();
    await fillInput("danger-confirmation-input", email);
    await tapIdUntilVisible(
      "danger-confirm-delete-button",
      by.id("login-screen"),
      { timeout: 30_000 },
    );

    await waitFor(element(by.id("login-screen")))
      .toBeVisible()
      .withTimeout(30_000);
  });
});
