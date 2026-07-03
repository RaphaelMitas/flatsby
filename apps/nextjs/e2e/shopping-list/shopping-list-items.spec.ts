import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

async function setupList(page: Page): Promise<number> {
  await page.goto("/shopping-list");
  await page
    .getByPlaceholder("add new list")
    .waitFor({ state: "visible", timeout: 15000 });
  await page.getByPlaceholder("add new list").fill(`E2E List ${Date.now()}`);
  await page.getByRole("button", { name: "Create List" }).click();
  await page.waitForURL(/\/shopping-list\/\d+/, { waitUntil: "networkidle" });

  const match = /\/shopping-list\/(\d+)/.exec(page.url());
  if (!match) {
    throw new Error("Could not extract shopping list ID from URL");
  }
  const id = match[1] ?? "";
  return parseInt(id, 10);
}

async function addItem(page: Page, name: string) {
  await page.getByPlaceholder("add new item").fill(name);
  await page.getByRole("button", { name: "Add Item" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function getItemLocator(page: Page, itemName: string) {
  const items = page.locator("[id^='list-item-']");
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
    await authPage.getByText("Produce").click();

    await authPage.getByPlaceholder("add new item").fill(itemName);
    await authPage.getByRole("button", { name: "Add Item" }).click();

    await expect(authPage.getByText(itemName)).toBeVisible();
    await expect(authPage.getByText("Produce")).toBeVisible();
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

    await expect(
      authPage
        .getByText("Purchased Items")
        .locator("+ div")
        .getByText(itemName),
    ).not.toBeVisible();

    const restoredItem = await getItemLocator(authPage, itemName);
    await expect(restoredItem.getByRole("checkbox")).not.toBeChecked();
  });

  test("Edit Item: renaming an existing item updates the text correctly", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    await setupList(authPage);

    const originalName = `Original ${Date.now()}`;
    await addItem(authPage, originalName);

    await authPage.waitForTimeout(1000);

    const listItem = await getItemLocator(authPage, originalName);
    await listItem.hover();
    await authPage.waitForTimeout(500);

    const editIcon = listItem.locator("svg").first();
    await editIcon.click();
    await authPage.waitForTimeout(500);

    const editInput = authPage
      .getByRole("textbox")
      .filter({ hasText: originalName })
      .locator("input")
      .or(
        authPage
          .locator("[id^='list-item-']")
          .filter({ hasText: originalName })
          .locator("input"),
      );
    await editInput.waitFor({ state: "visible", timeout: 5000 });
    await editInput.click();
    await editInput.press("Meta+a");
    await editInput.press("Backspace");
    const newName = `Renamed ${Date.now()}`;
    await editInput.fill(newName);

    const saveButton = authPage
      .locator("[id^='list-item-']")
      .filter({ hasText: originalName })
      .getByRole("button", { name: "Save" })
      .or(authPage.getByRole("button", { name: "Save" }).first());
    await saveButton.click();

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

    await authPage.waitForTimeout(1000);

    const listItem = await getItemLocator(authPage, itemName);
    await listItem.hover();
    await authPage.waitForTimeout(500);

    const svgElements = listItem.locator("svg");
    const svgCount = await svgElements.count();

    if (svgCount >= 2) {
      await svgElements.last().click();
    } else {
      await listItem.locator("svg").last().click();
    }

    await expect(authPage.getByText(itemName)).not.toBeVisible();
  });
});
