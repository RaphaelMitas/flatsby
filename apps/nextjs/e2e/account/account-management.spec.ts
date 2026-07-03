import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

const TEST_USER_EMAIL = "e2e-test@flatsby.test";

test.describe("Account Management", () => {
  test("access account deletion settings", async ({ authPage }) => {
    await authPage.goto("/user-settings");
    await authPage.waitForLoadState("networkidle");

    await expect(authPage.getByRole("heading", { name: "User Settings" })).toBeVisible();
    await expect(authPage.getByRole("button", { name: "Delete User" })).toBeVisible();
    await expect(authPage.getByText("This action cannot be undone.", { exact: true })).toBeVisible();
    await expect(authPage.getByRole("heading", { name: "Danger Zone" })).toBeVisible();
  });

  test("two-step email confirmation", async ({ authPage }) => {
    await authPage.goto("/user-settings");
    await authPage.waitForLoadState("networkidle");

    const deleteUserSection = authPage.getByText("Delete User").first();
    await expect(deleteUserSection).toBeVisible();

    const deleteUserButton = deleteUserSection
      .locator("..")
      .locator("..")
      .getByRole("button", { name: "Delete User" });

    await expect(deleteUserButton).toBeVisible();

    await deleteUserButton.click();

    const deleteInput = authPage.locator("#delete-user-name-input");
    await expect(deleteInput).toBeVisible();
    await expect(authPage.getByRole("button", { name: "Cancel" })).toBeVisible();

    await expect(deleteUserButton).toBeDisabled();

    await deleteInput.fill("wrong-email@test.com");
    await expect(deleteUserButton).toBeDisabled();

    await deleteInput.fill(TEST_USER_EMAIL);
    await expect(deleteUserButton).toBeEnabled();
  });

  test("delete account signs out and redirects", async ({ authPage }) => {
    await authPage.goto("/user-settings");
    await authPage.waitForLoadState("networkidle");

    const deleteUserButton = authPage.getByRole("button", { name: "Delete User" });
    await deleteUserButton.last().click();

    const deleteInput = authPage.locator("#delete-user-name-input");
    await deleteInput.fill(TEST_USER_EMAIL);

    await authPage.getByRole("button", { name: "Delete User" }).click();

    await authPage.waitForURL(/\/(auth\/login|\/)/);

    const currentUrl = authPage.url();
    expect(currentUrl).toMatch(/\/(auth\/login|\/)/);

    await expect(authPage.getByRole("button", { name: "Delete User" })).not.toBeVisible();
  });
});
