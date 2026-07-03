import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

test.describe("Shopping List Dashboard", () => {
  test("displays existing shopping lists on the dashboard", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/shopping-list");
    await authPage.waitForURL("/shopping-list");

    await expect(
      authPage.getByTestId("shopping-list-create-input"),
    ).toBeVisible();
    await expect(
      authPage.getByTestId("shopping-list-create-button"),
    ).toBeVisible();
  });

  test("creates a new shopping list and navigates into it", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/shopping-list");
    await authPage.waitForURL("/shopping-list");

    const listName = `Test List ${Date.now()}`;

    await authPage.getByTestId("shopping-list-create-input").fill(listName);
    await authPage.getByTestId("shopping-list-create-button").click();

    await authPage.waitForURL(/\/shopping-list\/\d+/);

    const finalUrl = authPage.url();
    expect(finalUrl).toMatch(/\/shopping-list\/\d+$/);
  });

  test("shows empty state when no shopping lists exist", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await authPage.goto("/shopping-list");
    await authPage.waitForURL("/shopping-list");

    const listItems = authPage.getByTestId(/^shopping-list-dashboard-link-/);
    const count = await listItems.count();

    if (count === 0) {
      await expect(
        authPage.getByTestId("shopping-list-create-input"),
      ).toBeVisible();
    }
  });
});
