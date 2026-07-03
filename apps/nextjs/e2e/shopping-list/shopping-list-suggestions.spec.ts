import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function setupList(page: Page): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByPlaceholder("add new list")
    .waitFor({ state: "visible", timeout: 15000 });
  await page
    .getByPlaceholder("add new list")
    .fill(`E2E Test List ${Date.now()}`);
  await page.getByRole("button", { name: "Create List" }).click();
  await page.waitForURL(/\/shopping-list\/\d+/, { waitUntil: "networkidle" });

  const match = page.url().match(/\/shopping-list\/(\d+)/);
  if (!match) {
    throw new Error("Could not extract shopping list ID from URL");
  }
  return parseInt(match[1], 10);
}

async function addItem(page: Page, itemName: string) {
  const input = page.getByPlaceholder("add new item");
  await input.fill(itemName);
  await page.getByRole("button", { name: "Add Item" }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByText(itemName)).toBeVisible();
}

test.describe("Shopping List Suggestions", () => {
  test("Suggestion Trigger — suggests previously added items as user types", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    await addItem(authPage, "Milk");
    await addItem(authPage, "Bread");
    await addItem(authPage, "Eggs");

    const input = authPage.getByPlaceholder("add new item");
    await input.fill("M");

    await authPage.waitForSelector('button[type="button"]:has-text("Milk")', {
      state: "visible",
      timeout: 5000,
    });

    const suggestions = authPage.locator(
      'button[type="button"]:has-text("Milk")',
    );
    await expect(suggestions.first()).toBeVisible();
  });

  test("Selection — clicking a suggestion auto-fills the input field", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    await addItem(authPage, "Milk");

    const input = authPage.getByPlaceholder("add new item");
    await input.fill("Mil");

    await authPage.waitForSelector('button[type="button"]:has-text("Milk")', {
      state: "visible",
      timeout: 5000,
    });

    await authPage.getByRole("button", { name: "Milk" }).click();

    await expect(input).toHaveValue("Milk");
  });
});
