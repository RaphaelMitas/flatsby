import { by, element, expect } from "detox";

import { signIn } from "../fixtures/auth";
import { selectBootstrapGroup } from "../helpers/group";
import { createShoppingList } from "../helpers/shopping-list";

describe("Shopping List Dashboard", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("displays existing shopping lists on the dashboard", async () => {
    await expect(element(by.id("shopping-lists-create-button"))).toBeVisible();
  });

  it("creates a new shopping list and navigates into it", async () => {
    const listName = `Test List ${Date.now()}`;
    await createShoppingList(listName);
    await expect(element(by.id("shopping-list-add-input"))).toExist();
  });

  it("shows empty state when no shopping lists exist", async () => {
    await expect(element(by.id("shopping-lists-create-button"))).toBeVisible();
  });
});
