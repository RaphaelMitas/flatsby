import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";
import { selectShoppingListCategory } from "../helpers/categories";

async function setupList(page: Page): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByTestId("shopping-list-create-input")
    .waitFor({ state: "visible", timeout: 15000 });
  await page
    .getByTestId("shopping-list-create-input")
    .fill(`E2E Test List ${Date.now()}`);
  await page.getByTestId("shopping-list-create-button").click();
  await page.waitForURL(/\/shopping-list\/\d+/);
  await page
    .getByTestId("shopping-list-item-input")
    .waitFor({ state: "visible" });

  const match = /\/shopping-list\/(\d+)/.exec(page.url());
  if (!match) {
    throw new Error("Could not extract shopping list ID from URL");
  }
  const id = match[1] ?? "";
  return parseInt(id, 10);
}

/**
 * Adds an item with an explicit category and waits for the server to actually
 * commit it (the UI renders optimistically before the mutation finishes).
 * Suggestions query the database, so typing before the item is committed
 * would cache an empty suggestion result (60s staleTime) and the suggestion
 * would never appear.
 */
async function addItem(page: Page, itemName: string, categoryId: string) {
  await selectShoppingListCategory(page, categoryId);
  const input = page.getByTestId("shopping-list-item-input");
  await input.fill(itemName);
  const committed = page.waitForResponse(
    (response) =>
      response.url().includes("createShoppingListItem") && response.ok(),
    { timeout: 15000 },
  );
  await page.getByTestId("shopping-list-add-item-button").click();
  await committed;
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

    await addItem(authPage, "Milk", "dairy");
    await addItem(authPage, "Bread", "bakery");
    await addItem(authPage, "Eggs", "dairy");

    const input = authPage.getByTestId("shopping-list-item-input");
    await input.fill("M");
    await authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk")
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    const suggestions = authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk");
    await expect(suggestions.first()).toBeVisible();
  });

  test("Selection — clicking a suggestion auto-fills the input field", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    await addItem(authPage, "Milk", "dairy");

    const input = authPage.getByTestId("shopping-list-item-input");
    await input.fill("Mil");
    await authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk")
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    await authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk")
      .click();

    await expect(input).toHaveValue("Milk");
  });
});
