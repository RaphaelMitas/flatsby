import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

const uniqueGroupName = () => `E2E Group ${Date.now()}`;

/**
 * Fills and submits the create-group form. Under heavy parallel load the
 * page may not be hydrated yet when the button is clicked, which triggers a
 * native form submit that reloads /group/create without calling the API.
 * Detect that (URL unchanged) and retry.
 */
async function submitCreateGroupForm(page: Page, name: string) {
  await page.goto("/group/create");
  await expect(async () => {
    if (new URL(page.url()).pathname === "/home") return;
    await page.getByTestId("group-create-name-input").fill(name);
    await page.getByTestId("group-create-submit").click();
    await page.waitForURL("/home", { timeout: 10000 });
  }).toPass({ timeout: 45000 });
}

async function createAndSelectGroup(page: Page, name: string): Promise<number> {
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

test.describe("Group Management", () => {
  test("create group via UI", async ({ authPage }: { authPage: Page }) => {
    const groupName = uniqueGroupName();

    await authPage.goto("/group/create");
    await expect(authPage.getByTestId("group-create-title")).toContainText(
      "Create a Group",
    );

    await submitCreateGroupForm(authPage, groupName);
  });

  test("group appears in dashboard", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const groupName = uniqueGroupName();

    await submitCreateGroupForm(authPage, groupName);

    await authPage.goto("/group");
    // .first(): during navigation the App Router can briefly render the
    // outgoing and incoming page at the same time, duplicating the title.
    await expect(
      authPage.getByTestId("group-dashboard-title").first(),
    ).toContainText("Your Groups");
    const groupCard = authPage
      .getByTestId(/^group-card-\d+$/)
      .filter({ hasText: groupName })
      .first();
    await expect(groupCard).toBeVisible();
    await expect(groupCard.getByText("1 member")).toBeVisible();
    const testId = await groupCard.getAttribute("data-testid");
    const match = testId?.match(/group-card-(\d+)/);
    const idFromMatch = match?.[1];
    const groupId = idFromMatch !== undefined ? parseInt(idFromMatch, 10) : 0;
    await expect(authPage.getByTestId(`group-card-${groupId}`)).toBeVisible();
  });

  test("add member by email form interaction", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByTestId("group-settings-title")).toBeVisible();
    await expect(
      authPage.getByTestId("group-manage-members-title"),
    ).toBeVisible();

    const emailInput = authPage.getByTestId("group-add-member-email");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("newuser@example.com");

    const addMemberButton = authPage.getByTestId("group-add-member-button");
    await expect(addMemberButton).toBeVisible();
    await addMemberButton.click();

    await expect(emailInput).toHaveValue("newuser@example.com");
  });

  test("change group name", async ({ authPage }: { authPage: Page }) => {
    const groupName = uniqueGroupName();
    const newName = `${groupName} Updated`;

    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByTestId("group-settings-title")).toBeVisible();

    const nameInput = authPage.getByTestId("group-name-input");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);

    const saveButton = authPage.getByTestId("group-name-save");
    await saveButton.click();

    await expect(
      authPage.getByText("Name changed successfully!"),
    ).toBeVisible();
    await expect(nameInput).toHaveValue(newName);
  });

  // TODO: Requires multi-user fixture
  // test("non-admin cannot change group name", () => {});
  // test("non-admin cannot add members", () => {});
  // test("non-admin cannot remove other members", () => {});

  test("delete group", async ({ authPage }: { authPage: Page }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByTestId("group-name-input")).toBeVisible();

    const currentGroupName = await authPage
      .getByTestId("group-name-input")
      .inputValue();
    await expect(
      authPage.getByTestId("group-delete-confirm-button"),
    ).toBeVisible();
    await expect(authPage.getByTestId("group-danger-zone-title")).toBeVisible();

    const deleteInput = authPage.getByTestId("group-delete-name-input");
    await deleteInput.fill(currentGroupName);

    const deleteButton = authPage.getByTestId("group-delete-confirm-button");
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await authPage.waitForURL("/group");
  });

  test("deleted group inaccessible", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const groupName = uniqueGroupName();
    const groupId = await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByTestId("group-name-input")).toBeVisible();

    const currentGroupName = await authPage
      .getByTestId("group-name-input")
      .inputValue();

    const deleteInput = authPage.getByTestId("group-delete-name-input");
    await deleteInput.fill(currentGroupName);

    const deleteButton = authPage.getByTestId("group-delete-confirm-button");
    await deleteButton.click();
    await authPage.waitForURL("/group");

    await expect(
      authPage.getByTestId(`group-card-${groupId}`),
    ).not.toBeVisible();
  });

  // TODO: Requires multi-user fixture
  // test("promote member to admin", () => {});
  // test("demote admin to member", () => {});
  // test("prevent removing last admin", () => {});
  // test("remove member", () => {});
  // test("member self-remove", () => {});
  // test("re-add previously removed member", () => {});
  // test("member sees group", () => {});

  test("delete group clears user references", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByTestId("group-name-input")).toBeVisible();

    const currentGroupName = await authPage
      .getByTestId("group-name-input")
      .inputValue();

    const deleteInput = authPage.getByTestId("group-delete-name-input");
    await deleteInput.fill(currentGroupName);

    const deleteButton = authPage.getByTestId("group-delete-confirm-button");
    await deleteButton.click();
    await authPage.waitForURL("/group");

    await authPage.goto("/", { timeout: 30000 });
    await authPage.waitForURL(/\/(home|group|auth)/, { timeout: 15000 });
  });
});
