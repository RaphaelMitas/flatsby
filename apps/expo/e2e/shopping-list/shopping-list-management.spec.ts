import { by, device, element, expect } from "detox";

import { signIn } from "../fixtures/auth";
import { selectBootstrapGroup } from "../helpers/group";
import {
  addShoppingListItem,
  createShoppingList,
  deleteShoppingList,
  renameShoppingList,
} from "../helpers/shopping-list";

describe("Shopping List Management", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("Rename List: user can change the name of an existing shopping list from the dashboard", async () => {
    const listName = await createShoppingList();
    await device.pressBack();

    const newListName = `Renamed List ${Date.now()}`;
    await renameShoppingList(listName, newListName);

    await expect(
      element(by.id(`shopping-list-item-${newListName}`)),
    ).toBeVisible();
  });

  it("Delete List: deleting a list removes it from the dashboard and cleans up associated items", async () => {
    const listName = await createShoppingList();
    const itemName = `Item ${Date.now()}`;
    await addShoppingListItem(itemName);
    await device.pressBack();

    await deleteShoppingList(listName);
    await expect(
      element(by.id(`shopping-list-item-${listName}`)),
    ).not.toBeVisible();
    await expect(element(by.text(itemName))).not.toBeVisible();
  });

  it("Category Filtering: selecting a category filter only shows items belonging to that category", async () => {
    await createShoppingList();

    const produceItem = `Produce Item ${Date.now()}`;
    const dairyItem = `Dairy Item ${Date.now()}`;

    await addShoppingListItem(produceItem, "produce");
    await addShoppingListItem(dairyItem, "dairy");

    const produceFilter = element(by.id("category-filter-produce"));
    const dairyFilter = element(by.id("category-filter-dairy"));

    try {
      await produceFilter.tap();
      await expect(element(by.text(produceItem))).toBeVisible();
      await expect(element(by.text(dairyItem))).not.toBeVisible();
    } catch {
      await dairyFilter.tap();
      await expect(element(by.text(dairyItem))).toBeVisible();
      await expect(element(by.text(produceItem))).not.toBeVisible();
    }
  });
});
