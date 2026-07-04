import { by, element, expect, waitFor } from "detox";

import { selectShoppingListCategory } from "./categories";
import { fillInput } from "./input";
import { tapIdUntilVisible, tapUntilVisible } from "./interaction";

export async function createShoppingList(
  name = `E2E List ${Date.now()}`,
): Promise<string> {
  await tapIdUntilVisible(
    "shopping-lists-create-button",
    by.id("create-shopping-list-name-input"),
    { timeout: 15_000 },
  );
  await fillInput("create-shopping-list-name-input", name);
  await element(by.id("create-shopping-list-submit-button")).tap();
  await waitFor(element(by.text(name)))
    .toExist()
    .withTimeout(15_000);
  await openShoppingList(name);
  return name;
}

export async function openShoppingList(name: string): Promise<void> {
  await waitFor(element(by.text(name)))
    .toExist()
    .withTimeout(15_000);

  try {
    await tapIdUntilVisible(
      `shopping-list-item-${name}`,
      by.id("shopping-list-add-input"),
      { timeout: 15_000, tapTimeout: 5_000, retries: 8 },
    );
    return;
  } catch {
    await tapUntilVisible(by.text(name), by.id("shopping-list-add-input"), {
      timeout: 20_000,
      tapTimeout: 5_000,
      retries: 8,
    });
  }
}

export async function addShoppingListItem(
  name: string,
  categoryId = "other",
  options?: { waitForCommit?: boolean },
): Promise<void> {
  await selectShoppingListCategory(categoryId);
  await fillInput("shopping-list-add-input", name);
  await element(by.id("shopping-list-add-button")).tap();
  if (options?.waitForCommit) {
    await waitFor(element(by.id("shopping-list-add-input")))
      .toHaveText("")
      .withTimeout(15_000);
  }
  await expect(element(by.text(name))).toExist();
}

export function shoppingListItemCheckbox(itemName: string) {
  return element(by.id(`shopping-list-item-checkbox-${itemName}`));
}

export async function swipeShoppingListItem(
  listName: string,
  direction: "left" | "right",
): Promise<void> {
  try {
    await element(by.id(`shopping-list-item-${listName}`)).swipe(
      direction,
      "fast",
      0.8,
    );
    return;
  } catch {
    await element(by.text(listName)).swipe(direction, "fast", 0.8);
  }
}

export async function swipeShoppingListItemRow(
  itemName: string,
  direction: "left" | "right",
): Promise<void> {
  await element(by.text(itemName)).swipe(direction, "fast", 0.8);
}

export async function renameShoppingList(
  listName: string,
  newName: string,
): Promise<void> {
  await swipeShoppingListItem(listName, "right");
  await waitFor(element(by.id("shopping-list-rename-input")))
    .toExist()
    .withTimeout(5_000);
  await fillInput("shopping-list-rename-input", newName);
  await element(by.id("shopping-list-rename-save")).tap();
  await waitFor(element(by.text(newName)))
    .toExist()
    .withTimeout(10_000);
}

export async function deleteShoppingList(listName: string): Promise<void> {
  await swipeShoppingListItem(listName, "left");
  await waitFor(element(by.id("delete-confirmation-modal")))
    .toExist()
    .withTimeout(5_000);
  await element(by.id("delete-confirmation-button")).tap();
  await waitFor(element(by.text(listName)))
    .not.toExist()
    .withTimeout(10_000);
}
