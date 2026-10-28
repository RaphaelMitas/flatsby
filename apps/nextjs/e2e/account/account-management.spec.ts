import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";
import { createTestExpense } from "../helpers/expenses";
import { waitForHydration } from "../helpers/hydration";

test.describe("Account Management", () => {
  test("access account deletion settings", async ({ authPage }) => {
    await authPage.goto("/user-settings");

    await expect(authPage.getByTestId("account-settings-title")).toBeVisible();
    await expect(
      authPage.getByTestId("delete-user-confirm-button"),
    ).toBeVisible();
    await expect(
      authPage.getByText("This action cannot be undone.", { exact: true }),
    ).toBeVisible();
    await expect(
      authPage.getByTestId("delete-user-danger-zone-title"),
    ).toBeVisible();
  });

  test("two-step email confirmation", async ({ authPage, testUser }) => {
    await authPage.goto("/user-settings");

    const deleteUserButton = authPage.getByTestId("delete-user-confirm-button");
    await expect(deleteUserButton).toBeVisible();

    await deleteUserButton.click();

    const deleteInput = authPage.getByTestId("delete-user-email-input");
    await expect(deleteInput).toBeVisible();
    await expect(
      authPage.getByTestId("delete-user-cancel-button"),
    ).toBeVisible();

    await expect(deleteUserButton).toBeDisabled();

    await deleteInput.fill("wrong-email@test.com");
    await expect(deleteUserButton).toBeDisabled();

    await deleteInput.fill(testUser.email);
    await expect(deleteUserButton).toBeEnabled();
  });

  test("delete account signs out and redirects", async ({
    authPage,
    testUser,
  }) => {
    await deleteAccount(authPage, testUser.email);
  });

  test("saves payment details and deletes them with the account", async ({
    authPage,
    testUser,
  }) => {
    await authPage.goto("/user-settings");

    const card = authPage.getByTestId("payment-details-card");
    const iban = card.getByTestId("payment-iban-input");
    await waitForHydration(iban);
    await card.getByTestId("payment-account-holder-input").fill("Test Holder");
    await iban.fill("DE89 3704 0044 0532 0130 01");
    await card.getByTestId("payment-save-button").click();
    await expect(card).toContainText("This IBAN isn't valid");

    await iban.fill("de89 3704 0044 0532 0130 00");
    await card.getByTestId("payment-paypal-input").fill("paypal.me/testholder");
    await card.getByTestId("payment-save-button").click();
    await expect(authPage.getByText("Payment details saved.")).toBeVisible();

    await authPage.reload();
    await expect(iban).toHaveValue("DE89 3704 0044 0532 0130 00");
    await expect(card.getByTestId("payment-paypal-input")).toHaveValue(
      "testholder",
    );

    await deleteAccount(authPage, testUser.email);
  });

  test("delete account whose only group has expenses", async ({
    authPage,
    testUser,
  }) => {
    await createTestExpense(authPage);
    await deleteAccount(authPage, testUser.email);
  });
});

async function deleteAccount(authPage: Page, email: string) {
  await authPage.goto("/user-settings");

  const deleteUserButton = authPage.getByTestId("delete-user-confirm-button");
  await deleteUserButton.click();

  const deleteInput = authPage.getByTestId("delete-user-email-input");
  await deleteInput.fill(email);

  await authPage.getByTestId("delete-user-confirm-button").click();

  await authPage.waitForURL(
    (url) => {
      const { pathname } = new URL(url);
      return pathname === "/" || pathname.startsWith("/auth/login");
    },
    { timeout: 30000 },
  );

  const { pathname } = new URL(authPage.url());
  expect(pathname === "/" || pathname.startsWith("/auth/login")).toBe(true);
  await expect(authPage).not.toHaveURL(/user-settings/);
}
