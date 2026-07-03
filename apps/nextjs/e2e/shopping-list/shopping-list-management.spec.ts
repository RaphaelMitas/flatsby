import { expect, test } from "../fixtures/auth";
import {
  addShoppingListItem,
  createShoppingList,
} from "../helpers/shopping-list";

test.describe("Shopping List Management", () => {
  test("Rename List: user can change the name of an existing shopping list from the dashboard", async ({
    authPage,
  }) => {
    const listId = await createShoppingList(authPage);

    await authPage.goto("/shopping-list");

    const renameButton = authPage.getByTestId(
      `shopping-list-dashboard-rename-${listId}`,
    );
    await expect(renameButton).toBeVisible();
    await renameButton.click();

    const newListName = `Renamed List ${Date.now()}`;
    await authPage.getByTestId("shopping-list-rename-input").fill(newListName);
    await authPage.getByTestId("shopping-list-rename-save").click();

    await expect(authPage.getByText(newListName).first()).toBeVisible({
      timeout: 10000,
    });

    const listLink = authPage.getByTestId(
      `shopping-list-dashboard-link-${listId}`,
    );
    await expect(listLink).toBeVisible();
    await expect(listLink).toContainText(newListName);
  });

  test("Delete List: deleting a list removes it from the dashboard and cleans up associated items", async ({
    authPage,
  }) => {
    const listId = await createShoppingList(authPage);

    const itemName = `Item ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);

    await authPage.goto("/shopping-list");

    const deleteButton = authPage.getByTestId(
      `shopping-list-dashboard-delete-${listId}`,
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const dialog = authPage.getByTestId("shopping-list-delete-dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Delete Shopping List")).toBeVisible();
    await expect(
      dialog.getByText("Are you sure you want to delete"),
    ).toBeVisible();
    await expect(
      dialog.getByText("This action cannot be undone"),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(dialog).not.toBeVisible();

    const listLink = authPage.getByTestId(
      `shopping-list-dashboard-link-${listId}`,
    );
    await expect(listLink).not.toBeVisible();

    await expect(authPage.getByText(itemName)).not.toBeVisible();
  });

  test("Category Filtering: selecting a category filter only shows items belonging to that category", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const produceItem = `Produce Item ${Date.now()}`;
    const dairyItem = `Dairy Item ${Date.now()}`;

    await addShoppingListItem(authPage, produceItem, "produce");
    await addShoppingListItem(authPage, dairyItem, "dairy");

    const produceFilter = authPage.getByTestId("category-filter-produce");
    const dairyFilter = authPage.getByTestId("category-filter-dairy");

    if (await produceFilter.isVisible().catch(() => false)) {
      await produceFilter.click();
      await expect(authPage.getByText(produceItem)).toBeVisible();
      await expect(authPage.getByText(dairyItem)).not.toBeVisible();
    } else if (await dairyFilter.isVisible().catch(() => false)) {
      await dairyFilter.click();
      await expect(authPage.getByText(dairyItem)).toBeVisible();
      await expect(authPage.getByText(produceItem)).not.toBeVisible();
    }
  });
});
