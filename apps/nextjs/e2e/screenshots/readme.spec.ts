import { expect, test } from "@playwright/test";

import { createAuthSession } from "../fixtures/auth";

const OUT = "test-results/readme-screenshots";

async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("nextjs-portal")) el.remove();
  });
}

test("captures README screenshots", async ({ page, baseURL }) => {
  await createAuthSession(page, baseURL, {
    seed: "store",
    name: "Alex Rivera",
    email: "alex-web@flatsby.test",
  });

  await page.addInitScript(() =>
    localStorage.setItem("analytics_notice_seen", "true"),
  );
  await page.goto("/home");
  await expect(page.getByText("Sunset Villa").first()).toBeVisible();
  await expect(page.getByTestId("home-card-expenses")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-home.png` });

  await page.goto("/shopping-list");
  await page.waitForURL(/\/shopping-list\/\d+/);
  await expect(page.getByText("Apples").first()).toBeVisible();
  await expect(page.getByText("Paper Towels").first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-shopping-list.png` });

  await page.goto("/expenses");
  await expect(page.getByText("Weekly shopping").first()).toBeVisible();
  await expect(page.getByText("Cleaning supplies").first()).toBeVisible();
  await expect(page.getByTestId("expense-debt-card")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-expenses.png` });

  await page.goto("/calendar");
  await expect(
    page.getByTestId("calendar-month").getByText("19:00 Flat dinner"),
  ).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-calendar.png` });

  await page.goto("/group/settings");
  await expect(page.getByText("Tom Baker").first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-group.png` });
});
