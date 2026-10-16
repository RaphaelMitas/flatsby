import { expect, test } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";

test.describe("Calendar", () => {
  test("creates a weekly task, ticks it off and deletes it", async ({
    authPage,
  }) => {
    const title = "Clean bathroom";
    await authPage.goto("/calendar");

    const addButton = authPage.getByTestId("calendar-add");
    await waitForHydration(addButton);
    await addButton.click();

    const form = authPage.getByTestId("calendar-form");
    await form.getByTestId("calendar-form-title").fill(title);
    await form.getByTestId("calendar-repeat-weekly").click();
    await expect(form.getByTestId("calendar-form-summary")).toContainText(
      "Every",
    );
    await form.getByTestId("calendar-form-submit").click();

    // Saved rows carry their server id; the optimistic one has a negative id
    const row = authPage
      .getByTestId(/^calendar-entry-\d+$/)
      .filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(authPage.getByTestId("calendar-day-progress")).toHaveText(
      "0 of 1 done",
    );

    // The tick shows before the server has it, so reloading early would drop it
    const saved = authPage.waitForResponse((response) =>
      response.url().includes("calendar.setDone"),
    );
    await row.getByTestId("calendar-entry-toggle").click();
    await expect(authPage.getByTestId("calendar-day-progress")).toHaveText(
      "1 of 1 done",
    );
    await expect(row).toContainText("Done by");
    await saved;

    await authPage.reload();
    await expect(authPage.getByTestId("calendar-day-progress")).toHaveText(
      "1 of 1 done",
    );

    await row.getByTestId("calendar-entry-open").click();
    const detail = authPage.getByTestId("calendar-detail");
    await expect(detail.getByRole("heading", { name: title })).toBeVisible();
    await expect(detail.getByText("History")).toBeVisible();

    const deleteButton = detail.getByTestId("calendar-detail-delete");
    await deleteButton.click();
    await expect(deleteButton).toHaveText(
      "Tap again to delete it and its history",
    );
    const deleted = authPage.waitForResponse((response) =>
      response.url().includes("calendar.delete"),
    );
    await deleteButton.click();

    await expect(row).toHaveCount(0);
    await expect(
      authPage.getByText("Nothing planned for this day"),
    ).toBeVisible();
    await deleted;

    await authPage.reload();
    await expect(
      authPage.getByText("Nothing planned for this day"),
    ).toBeVisible();
    await expect(row).toHaveCount(0);
  });
});
