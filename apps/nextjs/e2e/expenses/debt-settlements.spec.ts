import type { Page } from "@playwright/test";

import { createAuthSession, expect, test } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";

// seed=debts: Max owes you €42.50, Sophie owes you €18.00, you owe Lena
// €30.00 and Max $15.00; among the others Max owes Lena €25.00, Sophie owes
// Max €12.00 and Lena €8.00. Lena and Max added a PayPal.me name, Sophie and
// you didn't.
async function openSeededDebts(page: Page, baseURL: string | undefined) {
  await createAuthSession(page, baseURL, { seed: "debts" });
  await page.goto("/expenses/debts");
  await expect(page.getByTestId("debt-summary-title")).toBeVisible();
}

function directDebtRow(page: Page, name: string) {
  return page.getByTestId("direct-debt-row").filter({ hasText: name });
}

test.describe("Debt & Settlements", () => {
  test("shows the all settled up state in a fresh group", async ({
    authPage,
  }) => {
    await authPage.goto("/expenses/debts");

    await expect(authPage.getByTestId("debt-summary-title")).toHaveText(
      "Debts",
    );
    await expect(authPage.getByTestId("debt-summary-empty")).toBeVisible();
    await expect(authPage.getByText("All settled up")).toBeVisible();
  });

  test("shows your net and direct debts per person and currency", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    await expect(page.getByTestId("debt-hero")).toContainText("+€30.50");
    await expect(page.getByTestId("direct-debt-row")).toHaveCount(3);

    const max = directDebtRow(page, "Max");
    await expect(max).toContainText("€42.50");
    await expect(max).toContainText("$15.00");
    await expect(max.getByTestId("direct-debt-settle")).toHaveCount(2);
  });

  test("keeping currencies separate dismisses the conversion banner", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    const banner = page.getByTestId("currency-banner");
    await expect(banner).toContainText("Debts are now in");
    const keepSeparate = banner.getByTestId("currency-banner-keep-separate");
    await waitForHydration(keepSeparate);
    const saved = page.waitForResponse((response) =>
      response.url().includes("group.updateGroup"),
    );
    await keepSeparate.click();
    await expect(banner).toBeHidden();
    await saved;

    await page.reload();
    await expect(page.getByTestId("debt-summary-title")).toBeVisible();
    await expect(banner).toBeHidden();
  });

  test("settling a direct debt in full removes the row", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    const sophie = directDebtRow(page, "Sophie");
    const settle = sophie.getByTestId("direct-debt-settle");
    await waitForHydration(settle);
    await settle.click();

    const form = page.getByTestId("settlement-form");
    await expect(form.getByTestId("settlement-outstanding")).toContainText(
      "Sophie owes you directly",
    );
    await expect(form.getByTestId("settlement-amount-input")).toHaveValue("18");
    await form.getByTestId("settlement-record-button").click();

    await expect(form).not.toBeVisible();
    await expect(sophie).toHaveCount(0);
    await page.reload();
    await expect(directDebtRow(page, "Max")).toBeVisible();
    await expect(sophie).toHaveCount(0);
  });

  test("paying Lena links to her PayPal with the amount", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    const settle = page.getByRole("button", {
      name: "Record EUR payment with Lena",
    });
    await waitForHydration(settle);
    await settle.click();

    const form = page.getByTestId("settlement-form");
    await expect(
      form.getByTestId("settle-pay-card").getByTestId("settle-paypal-button"),
    ).toHaveAttribute("href", "https://paypal.me/lenaschneider/30.00EUR");
    await expect(form.getByTestId("settlement-record-button")).toHaveText(
      "I've paid, record it",
    );
  });

  test("Sophie paying you asks you to add your PayPal", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    const settle = page.getByRole("button", {
      name: "Record EUR payment with Sophie",
    });
    await waitForHydration(settle);
    await settle.click();

    await expect(
      page.getByTestId("settlement-form").getByTestId("settle-pay-no-details"),
    ).toContainText("You haven't added a PayPal.me link.");
  });

  test("recording Max paying Lena offers her link, not a PayPal button", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    const record = page.getByTestId("debt-others-record").first();
    await waitForHydration(record);
    await record.click();

    const card = page
      .getByTestId("settlement-form")
      .getByTestId("settle-pay-card");
    await expect(card).toContainText("Lena's PayPal");
    await expect(card.getByRole("button", { name: "Copy" })).toBeVisible();
    await expect(card.getByTestId("settle-paypal-button")).toHaveCount(0);
  });

  test("shows the debts between others, actual and simplified", async ({
    page,
    baseURL,
  }) => {
    await openSeededDebts(page, baseURL);

    const others = page.getByTestId("debt-others-row");
    await expect(others).toHaveCount(3);
    await expect(others.nth(0)).toContainText(/Max.*Lena.*€25\.00/);
    await expect(others.nth(1)).toContainText(/Sophie.*Max.*€12\.00/);
    await expect(others.nth(2)).toContainText(/Sophie.*Lena.*€8\.00/);

    const simplified = page.getByTestId("debt-mode-simplified");
    await waitForHydration(simplified);
    await simplified.click();

    await expect(others).toHaveCount(2);
    await expect(others.nth(0)).toContainText(/Max.*Lena.*€55\.50/);
    await expect(others.nth(1)).toContainText(/Sophie.*Lena.*€7\.50/);

    const mine = page.getByTestId("direct-debt-row");
    await expect(mine).toHaveCount(2);
    await expect(mine.nth(0)).toContainText(/Sophie.*pays you.*€30\.50/);
    await expect(mine.nth(1)).toContainText(/Max.*you pay.*\$15\.00/);
  });
});
