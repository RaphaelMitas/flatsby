import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const uniqueGroupName = () => `E2E Group ${Date.now()}`;

export async function submitCreateGroupForm(page: Page, name: string) {
  await page.goto("/group/create");
  await expect(async () => {
    if (new URL(page.url()).pathname === "/home") return;
    await page.getByTestId("group-create-name-input").fill(name);
    await page.getByTestId("group-create-submit").click();
    await page.waitForURL("/home", { timeout: 10000 });
  }).toPass({ timeout: 45000 });
}

export async function createAndSelectGroup(
  page: Page,
  name: string,
): Promise<number> {
  await submitCreateGroupForm(page, name);

  await page.goto("/group");

  const groupCard = page
    .getByTestId(/^group-card-\d+$/)
    .filter({ hasText: name })
    .first();
  await expect(groupCard).toBeVisible({ timeout: 15000 });
  const testId = await groupCard.getAttribute("data-testid");
  const match = testId?.match(/group-card-(\d+)/);
  const idFromMatch = match?.[1];
  const groupId = idFromMatch !== undefined ? parseInt(idFromMatch, 10) : 0;

  await groupCard.click();
  await page.waitForURL("/home");

  return groupId;
}

export async function deleteCurrentGroup(page: Page) {
  await page.goto("/group/settings");
  await expect(page.getByTestId("group-name-input")).toBeVisible();

  const currentGroupName = await page
    .getByTestId("group-name-input")
    .inputValue();

  const deleteInput = page.getByTestId("group-delete-name-input");
  await deleteInput.fill(currentGroupName);

  const deleteButton = page.getByTestId("group-delete-confirm-button");
  await deleteButton.click();
  await page.waitForURL("/group");
}
