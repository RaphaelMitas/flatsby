import type { Page } from "@playwright/test";

import { addDays, localDate } from "@flatsby/validators/calendar";

import { expect, test } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";

const writeSettled = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes("calendar.range") &&
      response.request().method() === "GET",
  );

test.describe("Calendar events", () => {
  test("an event over three days shows on each of them and as one bar per week", async ({
    authPage,
  }) => {
    const title = "Ski trip";
    const today = localDate();
    await authPage.goto("/calendar");
    const openView = async (view: "list" | "month") => {
      const tab = authPage.getByTestId(`calendar-view-${view}`);
      await waitForHydration(tab);
      await tab.click();
    };

    await openView("list");
    await authPage.getByTestId("calendar-add").click();
    const form = authPage.getByTestId("calendar-form");
    await form.getByTestId("calendar-form-title").fill(title);
    await form.getByTestId("calendar-form-kind-event").click();
    await form.getByTestId("calendar-form-event-ends-on").click();
    // The picker opens focused on the start day
    await authPage.keyboard.press("ArrowRight");
    await authPage.keyboard.press("ArrowRight");
    await authPage.keyboard.press("Enter");
    const saved = writeSettled(authPage);
    await form.getByTestId("calendar-form-submit").click();

    const section = (date: string) =>
      authPage.getByTestId(
        `calendar-agenda-${date === today ? "today" : date}`,
      );
    const rows = (date: string) =>
      section(date)
        .getByTestId(/^calendar-entry--?\d+$/)
        .filter({ hasText: title });
    for (const day of [0, 1, 2])
      await expect(rows(addDays(today, day))).toHaveCount(1);
    await expect(rows(addDays(today, 3))).toHaveCount(0);
    await expect(rows(addDays(today, 1))).toContainText(" – ");
    await saved;

    await authPage.reload();
    await openView("month");
    const bars = authPage
      .getByTestId("calendar-month-entry")
      .filter({ hasText: title });
    await expect(bars.first()).toBeVisible();
    // Three days always leave at least one stretch of two days within a week
    const cell = await authPage
      .getByTestId(`calendar-day-${today}`)
      .boundingBox();
    const widths = await bars.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().width),
    );
    expect(Math.max(...widths)).toBeGreaterThan(1.5 * (cell?.width ?? 0));
  });
});
