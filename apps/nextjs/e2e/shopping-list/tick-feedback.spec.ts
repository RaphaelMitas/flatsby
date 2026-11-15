import { expect, test } from "../fixtures/auth";
import {
  addShoppingListItem,
  createShoppingList,
  getShoppingListItemLocator,
} from "../helpers/shopping-list";

interface AnimationRecorder {
  __tickAnimations?: string[];
}

interface TransitionRecorder {
  __tickTransitions?: string[];
}

test.describe("Shopping List Tick Feedback", () => {
  test("ticking an item reorders the row instead of remounting it, so the tick animation runs", async ({
    authPage,
  }) => {
    await createShoppingList(authPage);

    const itemName = `Tick Me ${Date.now()}`;
    await addShoppingListItem(authPage, itemName);
    await addShoppingListItem(authPage, `Leave Me ${Date.now()}`);

    await authPage.evaluate(() => {
      const recorder = window as typeof window &
        AnimationRecorder &
        TransitionRecorder;
      recorder.__tickAnimations = [];
      recorder.__tickTransitions = [];
      document.addEventListener(
        "animationstart",
        (event) => recorder.__tickAnimations?.push(event.animationName),
        true,
      );
      document.addEventListener(
        "transitionrun",
        (event) => recorder.__tickTransitions?.push(event.propertyName),
        true,
      );
    });

    const listItem = await getShoppingListItemLocator(authPage, itemName);
    const checkbox = listItem.getByRole("checkbox");
    await expect(checkbox).toBeEnabled();

    await checkbox.evaluate((element: HTMLElement) => {
      element.dataset.tickProbe = "alive";
    });

    await checkbox.locator("..").click({ position: { x: 16, y: 32 } });

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
      .toContain("check-ripple");

    await expect
      .poll(() =>
        authPage.evaluate(
          () =>
            (window as typeof window & TransitionRecorder).__tickTransitions ??
            [],
        ),
      )
      .toContain("stroke-dashoffset");
  });
});
