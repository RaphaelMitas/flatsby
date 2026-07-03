import { expect, test } from "../fixtures/auth";
import { selectShoppingListCategory } from "../helpers/categories";
import {
  addShoppingListItem,
  createShoppingList,
  getShoppingListItemLocator,
} from "../helpers/shopping-list";

test.describe("Shopping List Items", () => {
  test("Add Item: adding an item with a name and manual category adds it to the active items list", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const itemName = `Test Item ${Date.now()}`;

    await selectShoppingListCategory(authPage, "produce");

    await authPage.getByTestId("shopping-list-item-input").fill(itemName);
    await authPage.getByTestId("shopping-list-add-item-button").click();

    await expect(authPage.getByText(itemName)).toBeVisible();
    await expect(authPage.getByText("Produce").first()).toBeVisible();
  });

  test("Complete Item: checking an item moves it from the Active section to the Purchased section", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const itemName = `Complete Me ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);

    const listItem = await getShoppingListItemLocator(authPage, itemName);
    await listItem.getByRole("checkbox").click();

    await expect(authPage.getByText("Purchased Items")).toBeVisible();

    const purchasedItem = await getShoppingListItemLocator(authPage, itemName);
    await expect(purchasedItem.getByRole("checkbox")).toBeChecked();
  });

  test("Undo Completion: unchecking a purchased item moves it back to the active list", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const itemName = `Undo Me ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);

    const activeItem = await getShoppingListItemLocator(authPage, itemName);
    await activeItem.getByRole("checkbox").click();

    await expect(authPage.getByText("Purchased Items")).toBeVisible();

    const purchasedItem = await getShoppingListItemLocator(authPage, itemName);
    await expect(purchasedItem.getByRole("checkbox")).toBeChecked();

    await purchasedItem.getByRole("checkbox").click();

    await expect(
      authPage
        .getByText("Purchased Items")
        .locator("+ div")
        .getByText(itemName),
    ).not.toBeVisible({ timeout: 10000 });

    const restoredItem = await getShoppingListItemLocator(authPage, itemName);
    await expect(restoredItem.getByRole("checkbox")).not.toBeChecked({
      timeout: 10000,
    });
  });

  test("Edit Item: renaming an existing item updates the text correctly", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const originalName = `Original ${Date.now()}`;
    await addShoppingListItem(authPage, originalName);

    const listItem = await getShoppingListItemLocator(authPage, originalName);
    const editButton = listItem.getByTestId(/^shopping-list-item-edit-\d+$/);
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
  }) => {
    await createShoppingList(authPage);

    const itemName = `Delete Me ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);

    const listItem = await getShoppingListItemLocator(authPage, itemName);
    const deleteButton = listItem.getByTestId(
      /^shopping-list-item-delete-\d+$/,
    );
    await deleteButton.click({ force: true });

    await expect(
      authPage
        .getByTestId(/^shopping-list-item-\d+$/)
        .filter({ hasText: itemName }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
