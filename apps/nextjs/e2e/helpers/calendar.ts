import type { Page } from "@playwright/test";

import { waitForHydration } from "./hydration";

export const writeSettled = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes("calendar.range") &&
      response.request().method() === "GET",
  );

export async function openCalendarView(page: Page, view: "list" | "month") {
  const tab = page.getByTestId(`calendar-view-${view}`);
  await waitForHydration(tab);
  await tab.click();
}
