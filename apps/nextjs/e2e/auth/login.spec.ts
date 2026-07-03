import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("renders with OAuth buttons", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByTestId("auth-login-title")).toBeVisible();
    await expect(page.getByTestId("auth-login-google-button")).toBeVisible();
    await expect(page.getByTestId("auth-login-apple-button")).toBeVisible();
  });

  test("has links to legal pages", async ({ page }) => {
    await page.goto("/auth/login");

    const termsLink = page.getByTestId("auth-login-terms-link");
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute("href", "/legal/terms");

    const privacyLink = page.getByTestId("auth-login-privacy-link");
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/legal/privacy");

    const legalNoticeLink = page.getByTestId("auth-login-legal-notice-link");
    await expect(legalNoticeLink).toBeVisible();
    await expect(legalNoticeLink).toHaveAttribute(
      "href",
      "/legal/legal-notice",
    );
  });

  test("shows tagline", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByTestId("auth-login-tagline")).toBeVisible();
  });
});
