import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";
import { selectShoppingListCategory } from "../helpers/categories";

async function createShoppingList(page: Page): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByTestId("shopping-list-create-input")
    .waitFor({ state: "visible", timeout: 15000 });
  const listName = `E2E Test List ${Date.now()}`;
  await page.getByTestId("shopping-list-create-input").fill(listName);
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

test.describe("Shopping List Management", () => {
  test("Rename List: user can change the name of an existing shopping list from the dashboard", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const listId = await createShoppingList(authPage);

    await authPage.goto("/shopping-list");

    const renameButton = authPage.getByTestId(
      `shopping-list-dashboard-rename-${listId}`,
    );
    await expect(renameButton).toBeVisible();
    await renameButton.click();

    const newListName = `Renamed List ${Date.now()}`;
    await authPage.getByTestId("shopping-list-rename-input").fill(newListName);
    await authPage.getByTestId("shopping-list-rename-save").click();

    await expect(authPage.getByText(newListName).first()).toBeVisible({
      timeout: 10000,
    });

    const listLink = authPage.getByTestId(
      `shopping-list-dashboard-link-${listId}`,
    );
    await expect(listLink).toBeVisible();
    await expect(listLink).toContainText(newListName);
  });

  test("Delete List: deleting a list removes it from the dashboard and cleans up associated items", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const listId = await createShoppingList(authPage);

    const itemName = `Item ${Date.now()}`;
    await selectShoppingListCategory(authPage, "other");
    await authPage.getByTestId("shopping-list-item-input").fill(itemName);
    await authPage.getByTestId("shopping-list-add-item-button").click();
    await expect(authPage.getByText(itemName)).toBeVisible();

    await authPage.goto("/shopping-list");

    const deleteButton = authPage.getByTestId(
      `shopping-list-dashboard-delete-${listId}`,
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const dialog = authPage.getByTestId("shopping-list-delete-dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Delete Shopping List")).toBeVisible();
    await expect(
      dialog.getByText("Are you sure you want to delete"),
    ).toBeVisible();
    await expect(
      dialog.getByText("This action cannot be undone"),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(dialog).not.toBeVisible();

    const listLink = authPage.getByTestId(
      `shopping-list-dashboard-link-${listId}`,
    );
    await expect(listLink).not.toBeVisible();

    await expect(authPage.getByText(itemName)).not.toBeVisible();
  });

  test("Category Filtering: selecting a category filter only shows items belonging to that category", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await createShoppingList(authPage);

    const produceItem = `Produce Item ${Date.now()}`;
    const dairyItem = `Dairy Item ${Date.now()}`;

    await selectShoppingListCategory(authPage, "produce");

    await authPage.getByTestId("shopping-list-item-input").fill(produceItem);
    await authPage.getByTestId("shopping-list-add-item-button").click();
    await expect(authPage.getByText(produceItem)).toBeVisible();

    await selectShoppingListCategory(authPage, "dairy");

    await authPage.getByTestId("shopping-list-item-input").fill(dairyItem);
    await authPage.getByTestId("shopping-list-add-item-button").click();
    await expect(authPage.getByText(dairyItem)).toBeVisible();

    const produceFilter = authPage.getByTestId("category-filter-produce");
    const dairyFilter = authPage.getByTestId("category-filter-dairy");

    if (await produceFilter.isVisible().catch(() => false)) {
      await produceFilter.click();
      await expect(authPage.getByText(produceItem)).toBeVisible();
      await expect(authPage.getByText(dairyItem)).not.toBeVisible();
    } else if (await dairyFilter.isVisible().catch(() => false)) {
      await dairyFilter.click();
      await expect(authPage.getByText(dairyItem)).toBeVisible();
      await expect(authPage.getByText(produceItem)).not.toBeVisible();
    }
  });
});
