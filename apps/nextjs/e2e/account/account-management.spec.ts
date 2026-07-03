import { expect, test } from "../fixtures/auth";

const TEST_USER_EMAIL = "e2e-test@flatsby.test";

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

  test("two-step email confirmation", async ({ authPage }) => {
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

    await deleteInput.fill(TEST_USER_EMAIL);
    await expect(deleteUserButton).toBeEnabled();
  });

  test("delete account signs out and redirects", async ({ authPage }) => {
    await authPage.goto("/user-settings");

    const deleteUserButton = authPage.getByTestId("delete-user-confirm-button");
    await deleteUserButton.click();

    const deleteInput = authPage.getByTestId("delete-user-email-input");
    await deleteInput.fill(TEST_USER_EMAIL);

    await authPage.getByTestId("delete-user-confirm-button").click();

    await authPage.waitForURL(/\/(auth\/login|\/)/);

    const currentUrl = authPage.url();
    expect(currentUrl).toMatch(/\/(auth\/login|\/)/);

    await expect(
      authPage.getByTestId("delete-user-confirm-button"),
    ).not.toBeVisible();
  });
});
