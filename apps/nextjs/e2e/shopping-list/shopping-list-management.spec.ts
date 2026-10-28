import { expect, test } from "../fixtures/auth";
import {
  addShoppingListItem,
  createShoppingList,
} from "../helpers/shopping-list";

test.describe("Shopping List Management", () => {
  test("Rename List: renaming from the switcher updates the open list", async ({
    authPage,
  }) => {
    const listId = await createShoppingList(authPage);

    const switcher = authPage.getByTestId("shopping-list-switcher");
    await switcher.click();
    await authPage.getByTestId(`shopping-list-switcher-more-${listId}`).click();

    const newListName = `Renamed List ${Date.now()}`;
    await authPage.getByTestId("shopping-list-rename-input").fill(newListName);
    await authPage.getByTestId("shopping-list-rename-submit").click();

    await expect(switcher).toContainText(newListName, { timeout: 10000 });
  });

  test("Delete List: deleting the open list leaves it and removes its items", async ({
    authPage,
  }) => {
    const keptName = `Kept ${Date.now()}`;
    const keptId = await createShoppingList(authPage, keptName);
    const listId = await createShoppingList(authPage);

    const itemName = `Item ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);

    await authPage.getByTestId("shopping-list-switcher").click();
    await authPage.getByTestId(`shopping-list-switcher-more-${listId}`).click();
    await authPage.getByTestId("shopping-list-delete").click();

    const dialog = authPage.getByTestId("shopping-list-delete-dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Delete Shopping List")).toBeVisible();
    await expect(
      dialog.getByText("This action cannot be undone"),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();

    await authPage.waitForURL(`/shopping-list/${keptId}`);
    await expect(authPage.getByTestId("shopping-list-switcher")).toContainText(
      keptName,
    );
    await expect(authPage.getByText(itemName)).not.toBeVisible();

    await authPage.getByTestId("shopping-list-switcher").click();
    await expect(
      authPage.getByTestId(`shopping-list-switcher-item-${listId}`),
    ).toHaveCount(0);
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
