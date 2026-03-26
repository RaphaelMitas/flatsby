import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

test.describe("Authenticated dashboard", () => {
  test("redirects authenticated user from / to /home or /group", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/");

    // Authenticated users get redirected to /home (if they have groups) or /group (if not)
    await authPage.waitForURL(/\/(home|group)/);

    const url = authPage.url();
    expect(url).toMatch(/\/(home|group)/);
  });

  test("authenticated user does not see landing page", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/");
    await authPage.waitForURL(/\/(home|group)/);

    // Should NOT see the landing page content
    await expect(
      authPage.getByText("Household management, simplified."),
    ).not.toBeVisible();
  });
});
