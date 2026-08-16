import { expect, test } from "@playwright/test";

import { createAuthSession } from "../fixtures/auth";

// README screenshot flow, the web counterpart of the mobile store-screenshot
// Maestro flow: everything on screen comes from the server-side `seed=store`
// scenario, so the captures are reads only and identical on every run.
// The release workflow globs this path to publish the `assets` branch the
// README embeds, so renaming it silently breaks the publish job.
const OUT = "test-results/readme-screenshots";

async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  // The dev-tools indicator only exists on local dev-server runs; CI captures
  // run against a production build.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("nextjs-portal")) el.remove();
  });
}

test("captures README screenshots", async ({ page, baseURL }) => {
  const session = await createAuthSession(page, baseURL, {
    seed: "store",
    name: "Alex Rivera",
    email: "alex-web@flatsby.test",
  });

  await page.goto("/home");
  await expect(page.getByText("Sunset Villa").first()).toBeVisible();
  await expect(page.getByText("€142.69").first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-home.png` });

  await page.goto("/shopping-list");
  await page.getByText("Groceries").first().click();
  await page.waitForURL(/\/shopping-list\/\d+/);
  await expect(page.getByText("Apples").first()).toBeVisible();
  await expect(page.getByText("Paper Towels").first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-shopping-list.png` });

  await page.goto("/expenses");
  await expect(page.getByText("Weekly shopping").first()).toBeVisible();
  await expect(page.getByText("Cleaning supplies").first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-expenses.png` });

  if (!session.conversationId) {
    throw new Error("seed=store did not return a conversationId");
  }
  await page.goto(`/chat/${session.conversationId}`);
  const question = page.getByText("How is our spending looking this month?");
  const chart = page.getByText("Spending by category");
  await expect(question).toBeVisible();
  await expect(chart).toBeVisible();
  const questionBox = await question.boundingBox();
  const chartBox = await chart.boundingBox();
  expect(questionBox?.y ?? 0).toBeLessThan(chartBox?.y ?? 0);
  // Recharts animates the pie in; capture the settled state.
  await page.waitForTimeout(1800);
  await settle(page);
  await page.screenshot({ path: `${OUT}/web-chat.png` });
});
