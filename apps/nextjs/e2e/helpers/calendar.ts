import type { Page } from "@playwright/test";

import { waitForHydration } from "./hydration";
import { refetched } from "./refetched";

export const writeSettled = (page: Page) => refetched(page, "calendar.range");

export async function openCalendarView(page: Page, view: "list" | "month") {
  const tab = page.getByTestId(`calendar-view-${view}`);
  await waitForHydration(tab);
  await tab.click();
}
