import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function setupList(page: Page): Promise<{ listId: number }> {
  await page.goto("/shopping-list");
  await page
    .getByTestId("shopping-list-create-input")
    .waitFor({ state: "visible", timeout: 15000 });
  await page.getByTestId("shopping-list-create-input").fill(`E2E List ${Date.now()}`);
  await page.getByRole("button", { name: "Create List" }).click();
  await page.waitForURL(/\/shopping-list\/\d+/, { waitUntil: "networkidle" });

  const match = /\/shopping-list\/(\d+)/.exec(page.url());
  if (!match) {
    throw new Error("Could not extract shopping list ID from URL");
  }
  const id = match[1] ?? "";
  return { listId: parseInt(id, 10) };
}

async function addItem(page: Page, name: string) {
  await page.getByTestId("shopping-list-item-input").fill(name);
  await page.getByTestId("shopping-list-add-item-button").click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
}

async function getItemLocator(page: Page, itemName: string) {
  const items = page.locator("[data-testid^='shopping-list-item-']");
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

test.describe("Shopping List Items", () => {
  test("Add Item: adding an item with a name and manual category adds it to the active items list", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    const itemName = `Test Item ${Date.now()}`;

    const categoryButton = authPage.getByRole("combobox");
    await categoryButton.click();

    await authPage.getByRole("heading", { name: "Select Category" }).waitFor();
    await authPage.getByRole("button", { name: /^Produce/ }).first().click();

    await authPage.getByTestId("shopping-list-item-input").fill(itemName);
    await authPage.getByRole("button", { name: "Add Item" }).click();

    await expect(authPage.getByText(itemName)).toBeVisible();
    await expect(authPage.getByText("Produce").first()).toBeVisible();
  });

  test("Complete Item: checking an item moves it from the Active section to the Purchased section", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    const itemName = `Complete Me ${Date.now()}`;
    await addItem(authPage, itemName);

    const listItem = await getItemLocator(authPage, itemName);
    await listItem.getByRole("checkbox").click();

    await expect(authPage.getByText("Purchased Items")).toBeVisible();

    const purchasedItem = await getItemLocator(authPage, itemName);
    await expect(purchasedItem.getByRole("checkbox")).toBeChecked();
  });

  test("Undo Completion: unchecking a purchased item moves it back to the active list", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    const itemName = `Undo Me ${Date.now()}`;
    await addItem(authPage, itemName);

    const activeItem = await getItemLocator(authPage, itemName);
    await activeItem.getByRole("checkbox").click();

    await expect(authPage.getByText("Purchased Items")).toBeVisible();

    const purchasedItem = await getItemLocator(authPage, itemName);
    await expect(purchasedItem.getByRole("checkbox")).toBeChecked();

    await purchasedItem.getByRole("checkbox").click();
    await authPage.waitForLoadState("networkidle");

    await expect(
      authPage
        .getByText("Purchased Items")
        .locator("+ div")
        .getByText(itemName),
    ).not.toBeVisible({ timeout: 10000 });

    const restoredItem = await getItemLocator(authPage, itemName);
    await expect(restoredItem.getByRole("checkbox")).not.toBeChecked({ timeout: 10000 });
  });

  test("Edit Item: renaming an existing item updates the text correctly", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    const originalName = `Original ${Date.now()}`;
    await addItem(authPage, originalName);

    const listItem = await getItemLocator(authPage, originalName);
    const editButton = listItem.locator("[data-testid^='shopping-list-item-edit-']");
    await editButton.click({ force: true });

    await expect(
      authPage.getByTestId("shopping-list-item-edit-form"),
    ).toBeVisible({ timeout: 5000 });

    const editInput = authPage
      .getByTestId("shopping-list-item-edit-form")
      .getByTestId("shopping-list-item-input");
    await expect(editInput).toHaveValue(originalName);
    await editInput.click();
    await editInput.press("Meta+a");
    const newName = `Renamed ${Date.now()}`;
    await editInput.fill(newName);

    await authPage
      .getByTestId("shopping-list-item-edit-form")
      .getByTestId("shopping-list-item-edit-save")
      .click();

    await expect(authPage.getByText(newName).first()).toBeVisible();
    await expect(authPage.getByText(originalName)).not.toBeVisible();
  });

  test("Delete Item: removing an item deletes it from the list immediately", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    const itemName = `Delete Me ${Date.now()}`;
    await addItem(authPage, itemName);

    const listItem = await getItemLocator(authPage, itemName);
    const deleteButton = listItem.locator("[data-testid^='shopping-list-item-delete-']");
    await deleteButton.click({ force: true });

    await expect(
      authPage
        .locator("[data-testid^='shopping-list-item-']")
        .filter({ hasText: itemName }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
