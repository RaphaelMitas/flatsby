import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("renders with OAuth buttons", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByRole("heading", { name: "Flatsby" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with apple/i }),
    ).toBeVisible();
  });

  test("has links to legal pages", async ({ page }) => {
    await page.goto("/auth/login");

    const termsLink = page.getByRole("link", { name: "Terms" });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute("href", "/legal/terms");

    const privacyLink = page.getByRole("link", { name: "Privacy Policy" });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/legal/privacy");

    const legalNoticeLink = page.getByRole("link", { name: "Legal Notice" });
    await expect(legalNoticeLink).toBeVisible();
    await expect(legalNoticeLink).toHaveAttribute(
      "href",
      "/legal/legal-notice",
    );
  });

  test("shows tagline", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(
      page.getByText("Manage your daily life with your flatmates."),
    ).toBeVisible();
  });
});
