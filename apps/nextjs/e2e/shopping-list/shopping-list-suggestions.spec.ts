import { expect, test } from "../fixtures/auth";
import {
  addShoppingListItem,
  createShoppingList,
} from "../helpers/shopping-list";

test.describe("Shopping List Suggestions", () => {
  test("Suggestion Trigger — suggests previously added items as user types", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    await addShoppingListItem(authPage, "Milk", "dairy", {
      waitForCommit: true,
    });
    await addShoppingListItem(authPage, "Bread", "bakery", {
      waitForCommit: true,
    });
    await addShoppingListItem(authPage, "Eggs", "dairy", { waitForCommit: true });

    const input = authPage.getByTestId("shopping-list-item-input");
    await input.fill("M");
    await authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk")
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    const suggestions = authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk");
    await expect(suggestions.first()).toBeVisible();
  });

  test("Selection — clicking a suggestion auto-fills the input field", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    await addShoppingListItem(authPage, "Milk", "dairy", {
      waitForCommit: true,
    });

    const input = authPage.getByTestId("shopping-list-item-input");
    await input.fill("Mil");
    await authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk")
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    await authPage
      .getByTestId("shopping-list-suggestion")
      .getByText("Milk")
      .click();

    await expect(input).toHaveValue("Milk");
  });
});
