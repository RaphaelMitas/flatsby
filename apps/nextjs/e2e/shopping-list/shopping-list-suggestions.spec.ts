import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function setupList(page: Page): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByTestId("shopping-list-create-input")
    .waitFor({ state: "visible", timeout: 15000 });
  await page
    .getByTestId("shopping-list-create-input")
    .fill(`E2E Test List ${Date.now()}`);
  await page.getByTestId("shopping-list-create-button").click();
  await page.waitForURL(/\/shopping-list\/\d+/, { waitUntil: "networkidle" });

  const match = /\/shopping-list\/(\d+)/.exec(page.url());
  if (!match) {
    throw new Error("Could not extract shopping list ID from URL");
  }
  const id = match[1] ?? "";
  return parseInt(id, 10);
}

async function addItem(page: Page, itemName: string) {
  const input = page.getByTestId("shopping-list-item-input");
  await input.fill(itemName);
  await page.getByTestId("shopping-list-add-item-button").click();
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

    const input = authPage.getByTestId("shopping-list-item-input");
    await input.fill("M");
    await authPage.getByTestId("shopping-list-suggestion").getByText("Milk").waitFor({
      state: "visible",
      timeout: 15000,
    });

    const suggestions = authPage.getByTestId("shopping-list-suggestion").getByText("Milk");
    await expect(suggestions.first()).toBeVisible();
  });

  test("Selection — clicking a suggestion auto-fills the input field", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    await addItem(authPage, "Milk");

    const input = authPage.getByTestId("shopping-list-item-input");
    await input.fill("Mil");
    await authPage.getByTestId("shopping-list-suggestion").getByText("Milk").waitFor({
      state: "visible",
      timeout: 15000,
    });

    await authPage.getByTestId("shopping-list-suggestion").getByText("Milk").click();

    await expect(input).toHaveValue("Milk");
  });
});
