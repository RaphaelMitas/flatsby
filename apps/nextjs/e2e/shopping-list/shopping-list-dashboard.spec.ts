import { expect, test } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";
import { createShoppingList } from "../helpers/shopping-list";

test.describe("Shopping List Switcher", () => {
  test("a group without lists starts on the first-list page and opens the new list", async ({
    authPage,
  }) => {
    await authPage.goto("/shopping-list");
    await expect(authPage.getByTestId("first-list-title")).toBeVisible();

    const preset = authPage.getByTestId("first-list-preset-groceries");
    await waitForHydration(preset);
    await preset.click();
    await expect(authPage.getByTestId("first-list-input")).toHaveValue(
      "Groceries",
    );
    await authPage.getByTestId("first-list-create").click();

    await authPage.waitForURL(/\/shopping-list\/\d+$/);
    await expect(authPage.getByTestId("shopping-list-switcher")).toContainText(
      "Groceries",
    );
  });

  test("/shopping-list opens the last used list", async ({ authPage }) => {
    const firstId = await createShoppingList(authPage, `First ${Date.now()}`);
    const secondId = await createShoppingList(authPage, `Second ${Date.now()}`);
    expect(secondId).not.toBe(firstId);

    await authPage.goto("/shopping-list");
    await authPage.waitForURL(`/shopping-list/${secondId}`);
  });

  test("switching lists from the switcher", async ({ authPage }) => {
    const firstName = `First ${Date.now()}`;
    const firstId = await createShoppingList(authPage, firstName);
    await createShoppingList(authPage, `Second ${Date.now()}`);

    const switcher = authPage.getByTestId("shopping-list-switcher");
    await waitForHydration(switcher);
    await switcher.click();
    await authPage
      .getByTestId(`shopping-list-switcher-item-${firstId}`)
      .click();

    await authPage.waitForURL(`/shopping-list/${firstId}`);
    await expect(switcher).toContainText(firstName);
  });
});
