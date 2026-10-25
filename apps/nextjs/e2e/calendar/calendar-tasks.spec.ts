import { expect, test } from "../fixtures/auth";
import { openCalendarView, writeSettled } from "../helpers/calendar";

test.describe("Calendar", () => {
  test("creates a weekly task with an end, ticks it off and deletes it", async ({
    authPage,
  }) => {
    const title = "Clean bathroom";
    await authPage.goto("/calendar");
    // The web opens on the month; the list is where a day's progress shows
    const openList = () => openCalendarView(authPage, "list");

    const addButton = authPage.getByTestId("calendar-add");
    await openList();
    await addButton.click();

    const form = authPage.getByTestId("calendar-form");
    await form.getByTestId("calendar-form-title").fill(title);
    await form.getByTestId("calendar-repeat-weeks").click();
    await expect(form.getByTestId("calendar-form-summary")).toContainText(
      "Every",
    );
    await form.getByTestId("calendar-form-ends-on-date").click();
    await expect(form.getByTestId("calendar-form-ends-date")).toBeVisible();
    await expect(form.getByTestId("calendar-form-summary")).toContainText(
      "until",
    );
    await form.getByTestId("calendar-form-submit").click();

    // A weekly task shows up once in the seven days, so everything is checked on today
    const todaySection = authPage.getByTestId("calendar-agenda-today");
    const progress = todaySection.getByTestId("calendar-day-progress");
    // Saved rows carry their server id; the optimistic one has a negative id
    const row = todaySection
      .getByTestId(/^calendar-entry-\d+$/)
      .filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(progress).toHaveText("0 of 1 done");

    const ticked = writeSettled(authPage);
    await row.getByTestId("calendar-entry-toggle").click();
    await expect(progress).toHaveText("1 of 1 done");
    await expect(row).toContainText("Done by");
    await ticked;

    await authPage.reload();
    await openList();
    await expect(progress).toHaveText("1 of 1 done");

    await row.getByTestId("calendar-entry-open").click();
    const detail = authPage.getByTestId("calendar-detail");
    await expect(detail.getByRole("heading", { name: title })).toBeVisible();
    await expect(detail.getByText("History")).toBeVisible();
    await expect(detail.getByText(/^Every .* · until /)).toBeVisible();

    const deleteButton = detail.getByTestId("calendar-detail-delete");
    await deleteButton.click();
    await expect(deleteButton).toHaveText(
      "Press again to delete it and its history",
    );
    const deleted = writeSettled(authPage);
    await deleteButton.click();

    await expect(row).toHaveCount(0);
    await expect(todaySection.getByText("Nothing planned")).toBeVisible();
    await deleted;

    await authPage.reload();
    await openList();
    await expect(todaySection.getByText("Nothing planned")).toBeVisible();
    await expect(row).toHaveCount(0);
  });
});
