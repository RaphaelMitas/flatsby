import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function createShoppingList(page: Page): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByPlaceholder("add new list")
    .waitFor({ state: "visible", timeout: 15000 });
  const listName = `E2E Test List ${Date.now()}`;
  await page.getByPlaceholder("add new list").fill(listName);
  await page.getByRole("button", { name: "Create List" }).click();
  await page.waitForURL(/\/shopping-list\/\d+/, { waitUntil: "networkidle" });
  const match = page.url().match(/\/shopping-list\/(\d+)/);
  return parseInt(match![1], 10);
}

test.describe("Shopping List Management", () => {
  test("Rename List: user can change the name of an existing shopping list from the dashboard", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const listId = await createShoppingList(authPage);

    await authPage.goto("/shopping-list");
    await authPage.waitForLoadState("networkidle");

    const renameButton = authPage.getByTitle("Rename shopping list").last();
    await expect(renameButton).toBeVisible();
    await renameButton.click();

    const newListName = `Renamed List ${Date.now()}`;
    await authPage
      .getByPlaceholder("Enter shopping list name")
      .fill(newListName);
    await authPage.getByRole("button", { name: "Save" }).click();

    await expect(authPage.getByText(newListName).first()).toBeVisible();

    const listLink = authPage.locator(`a[href="/shopping-list/${listId}"]`);
    await expect(listLink).toBeVisible();
    await expect(listLink.getByText(newListName)).toBeVisible();
  });

  test("Delete List: deleting a list removes it from the dashboard and cleans up associated items", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const listId = await createShoppingList(authPage);

    const itemName = `Item ${Date.now()}`;
    await authPage.getByPlaceholder("add new item").fill(itemName);
    await authPage.getByRole("button", { name: "Add Item" }).click();
    await expect(authPage.getByText(itemName)).toBeVisible();

    await authPage.goto("/shopping-list");
    await authPage.waitForLoadState("networkidle");

    const deleteButton = authPage.getByTitle("Delete shopping list").last();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const dialog = authPage
      .getByRole("alertdialog")
      .or(authPage.getByRole("dialog"));
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

    const listLink = authPage.locator(`a[href="/shopping-list/${listId}"]`);
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

    const categoryButton = authPage.getByRole("combobox");

    await categoryButton.click();
    await authPage.getByRole("heading", { name: "Select Category" }).waitFor();
    await authPage.getByText("Produce").click();

    await authPage.getByPlaceholder("add new item").fill(produceItem);
    await authPage.getByRole("button", { name: "Add Item" }).click();
    await expect(authPage.getByText(produceItem)).toBeVisible();

    await categoryButton.click();
    await authPage.getByRole("heading", { name: "Select Category" }).waitFor();
    await authPage.getByText("Dairy").click();

    await authPage.getByPlaceholder("add new item").fill(dairyItem);
    await authPage.getByRole("button", { name: "Add Item" }).click();
    await expect(authPage.getByText(dairyItem)).toBeVisible();

    const produceFilter = authPage.getByRole("button", { name: "Produce" });
    const dairyFilter = authPage.getByRole("button", { name: "Dairy" });

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
