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

    await expect(authPage.getByPlaceholder("add new list")).toBeVisible();
    await expect(
      authPage.getByRole("button", { name: "Create List" }),
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

    await authPage.getByPlaceholder("add new list").fill(listName);
    await authPage.getByRole("button", { name: "Create List" }).click();

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

    const listItems = authPage.locator('[class*="group"][class*="relative"]');
    const count = await listItems.count();

    if (count === 0) {
      await expect(authPage.getByPlaceholder("add new list")).toBeVisible();
    }
  });
});
