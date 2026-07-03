import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { selectShoppingListCategory } from "./categories";

export async function createShoppingList(
  page: Page,
  name = `E2E List ${Date.now()}`,
): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByTestId("shopping-list-create-input")
    .waitFor({ state: "visible", timeout: 15000 });
  await page.getByTestId("shopping-list-create-input").fill(name);
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

export async function addShoppingListItem(
  page: Page,
  name: string,
  categoryId = "other",
  options?: { waitForCommit?: boolean },
) {
  await selectShoppingListCategory(page, categoryId);
  const input = page.getByTestId("shopping-list-item-input");
  await input.fill(name);

  if (options?.waitForCommit) {
    const committed = page.waitForResponse(
      (response) =>
        response.url().includes("createShoppingListItem") && response.ok(),
      { timeout: 15000 },
    );
    await page.getByTestId("shopping-list-add-item-button").click();
    await committed;
    await expect(input).toHaveValue("");
  } else {
    await page.getByTestId("shopping-list-add-item-button").click();
  }

  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
}

export async function getShoppingListItemLocator(page: Page, itemName: string) {
  const items = page.getByTestId(/^shopping-list-item-\d+$/);
  for (let i = 0; i < (await items.count()); i++) {
    const item = items.nth(i);
    if (
      await item
        .getByText(itemName)
        .isVisible()
        .catch(() => false)
    ) {
      return item;
    }
  }
  throw new Error(`Item "${itemName}" not found`);
}
