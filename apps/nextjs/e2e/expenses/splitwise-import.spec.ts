import { createAuthSession, expect, test } from "../fixtures/auth";

const ROWS = 600;

function splitwiseCsv() {
  const header = "Date,Description,Category,Cost,Currency,Me,Lena";
  const rows = Array.from({ length: ROWS }, (_, i) => {
    const day = new Date(Date.UTC(2023, 0, 1) + i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return `${day},Groceries ${i},Groceries,10.00,EUR,5.00,-5.00`;
  });
  return [header, ...rows].join("\n");
}

test("Splitwise Import: a history larger than 500 expenses imports in one go", async ({
  page,
  baseURL,
}) => {
  await createAuthSession(page, baseURL, { seed: "debts" });
  await page.goto("/group/settings");

  await page.getByRole("button", { name: "Import from Splitwise" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "splitwise.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(splitwiseCsv()),
  });
  await expect(dialog.getByText(`Found ${ROWS} rows`)).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();

  const [me, lena] = await dialog.getByRole("combobox").all();
  await me?.click();
  await page.getByRole("option", { name: /E2E Test User/ }).click();
  await lena?.click();
  await page.getByRole("option", { name: /Lena/ }).click();
  await dialog.getByRole("button", { name: "Next" }).click();

  await expect(dialog.getByText(`${ROWS} expenses to import`)).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: `Import ${ROWS} expenses` }).click();

  await expect(
    dialog.getByText(`Successfully imported ${ROWS} expenses.`),
  ).toBeVisible({ timeout: 30000 });
});
