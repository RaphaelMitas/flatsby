import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForHydration } from "./hydration";

export const uniqueGroupName = () => `E2E Group ${Date.now()}`;

export async function submitCreateGroupForm(page: Page, name: string) {
  await page.goto("/group/create");
  const done = page.getByTestId("group-invite-done");
  await expect(async () => {
    if (new URL(page.url()).pathname === "/home") return;
    // Once created, the invite step replaces the form, so a retry must not create again
    if (!(await done.isVisible())) {
      await page.getByTestId("group-create-name-input").fill(name);
      await page.getByTestId("group-create-submit").click();
    }
    await done.click({ timeout: 10000 });
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

// The member list refetches once a member change settles; navigating earlier aborts it
export const groupRefetched = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes("group.getGroup") &&
      response.request().method() === "GET",
  );

export async function addPlaceholder(page: Page, name: string) {
  await page.goto("/group/settings");
  const input = page.getByTestId("placeholder-name-input");
  await waitForHydration(input);
  await input.fill(name);
  const saved = groupRefetched(page);
  await page.getByTestId("placeholder-add-button").click();
  await expect(page.getByTestId(`placeholder-row-${name}`)).toBeVisible();
  await saved;
}
