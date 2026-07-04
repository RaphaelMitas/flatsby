import { by, element, expect, waitFor } from "detox";

import { signIn } from "../fixtures/auth";
import { selectBootstrapGroup } from "../helpers/group";
import { fillInput } from "../helpers/input";
import { tapIdUntilVisible, tapUntilVisible } from "../helpers/interaction";
import {
  addShoppingListItem,
  createShoppingList,
  swipeShoppingListItemRow,
} from "../helpers/shopping-list";

describe("Shopping List Items", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("Add Item: adding an item with a name and manual category adds it to the active items list", async () => {
    await createShoppingList();

    const itemName = `Test Item ${Date.now()}`;
    await addShoppingListItem(itemName, "produce");

    await expect(element(by.text(itemName))).toBeVisible();
  });

  it("Complete Item: checking an item moves it from the Active section to the Purchased section", async () => {
    await createShoppingList();

    const itemName = `Complete Me ${Date.now()}`;
    await addShoppingListItem(itemName);

    await tapUntilVisible(
      by.id(`shopping-list-item-checkbox-${itemName}`),
      by.text("Purchased Items"),
      { timeout: 10_000 },
    );

    await expect(element(by.text("Purchased Items"))).toBeVisible();
  });

  it("Undo Completion: unchecking a purchased item moves it back to the active list", async () => {
    await createShoppingList();

    const itemName = `Undo Me ${Date.now()}`;
    await addShoppingListItem(itemName);

    await tapUntilVisible(
      by.id(`shopping-list-item-checkbox-${itemName}`),
      by.text("Purchased Items"),
      { timeout: 10_000 },
    );
    await expect(element(by.text("Purchased Items"))).toBeVisible();

    await tapUntilVisible(
      by.id(`shopping-list-item-checkbox-${itemName}`),
      by.text(itemName),
      { timeout: 10_000 },
    );
    await expect(element(by.text(itemName))).toBeVisible();
  });

  it("Edit Item: renaming an existing item updates the text correctly", async () => {
    await createShoppingList();

    const originalName = `Original ${Date.now()}`;
    await addShoppingListItem(originalName);

    await swipeShoppingListItemRow(originalName, "right");
    await tapUntilVisible(by.text("Edit"), by.id("edit-item-name-input"), {
      timeout: 10_000,
    });

    const newName = `Renamed ${Date.now()}`;
    await fillInput("edit-item-name-input", newName);
    await tapIdUntilVisible("edit-item-submit-button", by.text(newName), {
      timeout: 10_000,
    });

    await expect(element(by.text(newName))).toBeVisible();
    await expect(element(by.text(originalName))).not.toBeVisible();
  });

  it("Delete Item: removing an item deletes it from the list immediately", async () => {
    await createShoppingList();

    const itemName = `Delete Me ${Date.now()}`;
    await addShoppingListItem(itemName);

    await swipeShoppingListItemRow(itemName, "left");
    await waitFor(element(by.id("delete-confirmation-modal")))
      .toBeVisible()
      .withTimeout(5_000);
    await element(by.id("delete-confirmation-button")).tap();

    await waitFor(element(by.text(itemName)))
      .not.toBeVisible()
      .withTimeout(10_000);
  });
});
