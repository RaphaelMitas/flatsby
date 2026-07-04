import { by, element, expect, waitFor } from "detox";

import { signIn } from "../fixtures/auth";
import { selectBootstrapGroup } from "../helpers/group";
import { fillInput } from "../helpers/input";
import {
  addShoppingListItem,
  createShoppingList,
} from "../helpers/shopping-list";

describe("Shopping List Suggestions", () => {
  beforeEach(async () => {
    await signIn();
    await selectBootstrapGroup();
  });

  it("Suggestion Trigger — suggests previously added items as user types", async () => {
    await createShoppingList();

    await addShoppingListItem("Milk", "dairy", { waitForCommit: true });
    await addShoppingListItem("Bread", "bakery", { waitForCommit: true });
    await addShoppingListItem("Eggs", "dairy", { waitForCommit: true });

    await fillInput("shopping-list-add-input", "M");
    await waitFor(element(by.id("shopping-list-suggestion")))
      .toBeVisible()
      .withTimeout(15_000);
    await expect(element(by.text("Milk"))).toBeVisible();
  });

  it("Selection — clicking a suggestion auto-fills the input field", async () => {
    await createShoppingList();

    await addShoppingListItem("Milk", "dairy", { waitForCommit: true });

    await fillInput("shopping-list-add-input", "Mil");
    await waitFor(element(by.id("shopping-list-suggestion")))
      .toBeVisible()
      .withTimeout(15_000);
    await element(by.text("Milk")).tap();

    await expect(element(by.id("shopping-list-add-input"))).toHaveText("Milk");
  });
});
