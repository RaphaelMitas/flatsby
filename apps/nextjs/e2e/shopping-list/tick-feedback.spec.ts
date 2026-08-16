import { expect, test } from "../fixtures/auth";
import {
  addShoppingListItem,
  createShoppingList,
  getShoppingListItemLocator,
} from "../helpers/shopping-list";

interface AnimationRecorder {
  __tickAnimations?: string[];
}

test.describe("Shopping List Tick Feedback", () => {
  test("ticking an item reorders the row instead of remounting it, so the tick animation runs", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const itemName = `Tick Me ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);

    await authPage.evaluate(() => {
      const recorder = window as typeof window & AnimationRecorder;
      recorder.__tickAnimations = [];
      document.addEventListener(
        "animationstart",
        (event) => recorder.__tickAnimations?.push(event.animationName),
        true,
      );
    });

    const listItem = await getShoppingListItemLocator(authPage, itemName);
    const checkbox = listItem.getByRole("checkbox");
    await expect(checkbox).toBeEnabled();

    // Brand the live node: if it is still branded once the row has moved to
    // Purchased, the row was reordered rather than unmounted mid-animation.
    await checkbox.evaluate((element: HTMLElement) => {
      element.dataset.tickProbe = "alive";
    });

    await checkbox.click();

    await expect(authPage.getByText("Purchased Items")).toBeVisible();
    const purchasedItem = await getShoppingListItemLocator(authPage, itemName);
    await expect(purchasedItem.getByRole("checkbox")).toBeChecked();

    await expect(
      purchasedItem
        .getByRole("checkbox")
        .evaluate((element: HTMLElement) => element.dataset.tickProbe),
    ).resolves.toBe("alive");

    await expect
      .poll(() =>
        authPage.evaluate(
          () =>
            (window as typeof window & AnimationRecorder).__tickAnimations ??
            [],
        ),
      )
      .toEqual(expect.arrayContaining(["check-ripple", "check-draw"]));
  });
});
