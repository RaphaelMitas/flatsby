import type { Page } from "@playwright/test";

export const refetched = (page: Page, procedure: string) =>
  page.waitForResponse(
    (response) =>
      response.url().includes(procedure) &&
      response.request().method() === "GET",
  );
