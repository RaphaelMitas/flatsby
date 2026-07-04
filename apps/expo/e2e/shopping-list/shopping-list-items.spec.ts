import { by, element, expect, waitFor } from "detox";

import { signIn } from "../fixtures/auth";
import { selectShoppingListCategory } from "../helpers/categories";
import { selectBootstrapGroup } from "../helpers/group";
import { fillInput } from "../helpers/input";
import {
  addShoppingListItem,
  createShoppingList,
  shoppingListItemCheckbox,
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

    await selectShoppingListCategory("produce");
    await fillInput("shopping-list-add-input", itemName);
    await element(by.id("shopping-list-add-button")).tap();

    await expect(element(by.text(itemName))).toBeVisible();
    await expect(element(by.text("Produce"))).toBeVisible();
  });

  it("Complete Item: checking an item moves it from the Active section to the Purchased section", async () => {
    await createShoppingList();

    const itemName = `Complete Me ${Date.now()}`;
    await addShoppingListItem(itemName);

    await shoppingListItemCheckbox(itemName).tap();

    await expect(element(by.text("Purchased Items"))).toBeVisible();
  });

  it("Undo Completion: unchecking a purchased item moves it back to the active list", async () => {
    await createShoppingList();

    const itemName = `Undo Me ${Date.now()}`;
    await addShoppingListItem(itemName);

    await shoppingListItemCheckbox(itemName).tap();
    await expect(element(by.text("Purchased Items"))).toBeVisible();

    await shoppingListItemCheckbox(itemName).tap();
    await expect(element(by.text(itemName))).toBeVisible();
  });

  it("Edit Item: renaming an existing item updates the text correctly", async () => {
    await createShoppingList();

    const originalName = `Original ${Date.now()}`;
    await addShoppingListItem(originalName);

    await swipeShoppingListItemRow(originalName, "right");
    await element(by.text("Edit")).tap();

    await waitFor(element(by.id("edit-item-name-input")))
      .toBeVisible()
      .withTimeout(5_000);

    const newName = `Renamed ${Date.now()}`;
    await fillInput("edit-item-name-input", newName);
    await element(by.id("edit-item-submit-button")).tap();

    await expect(element(by.text(newName))).toBeVisible();
    await expect(element(by.text(originalName))).not.toBeVisible();
  });

  it("Delete Item: removing an item deletes it from the list immediately", async () => {
    await createShoppingList();

    const itemName = `Delete Me ${Date.now()}`;
    await addShoppingListItem(itemName);

    await swipeShoppingListItemRow(itemName, "left");
    await element(by.id("delete-confirmation-button")).tap();

    await waitFor(element(by.text(itemName)))
      .not.toBeVisible()
      .withTimeout(10_000);
  });
});
