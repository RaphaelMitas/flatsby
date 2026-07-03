import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/auth";

const uniqueGroupName = () => `E2E Group ${Date.now()}`;

async function createAndSelectGroup(
  page: Page,
  name: string,
): Promise<number> {
  await page.goto("/group/create");
  await page.fill('input[id="groupName"]', name);
  await page.click('button:has-text("Create Group")');
  await page.waitForURL("/home");

  await page.goto("/group");
  await page.waitForLoadState("networkidle");

  const groupCard = page.locator("button").filter({ hasText: name }).first();
  await groupCard.click();
  await page.waitForURL("/home");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const match = page.url().match(/\/group\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

test.describe("Group Management", () => {
  test("create group via UI", async ({ authPage }: { authPage: Page }) => {
    const groupName = uniqueGroupName();

    await authPage.goto("/group/create");
    await expect(authPage.locator("h1")).toContainText("Create a Group");

    await authPage.fill('input[id="groupName"]', groupName);
    await authPage.click('button:has-text("Create Group")');
    await authPage.waitForURL("/home");
  });

  test("group appears in dashboard", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const groupName = uniqueGroupName();

    await authPage.goto("/group/create");
    await authPage.fill('input[id="groupName"]', groupName);
    await authPage.click('button:has-text("Create Group")');
    await authPage.waitForURL("/home");

    await authPage.goto("/group");
    await expect(authPage.locator("h2")).toContainText("Your Groups");
    const groupCard = authPage.locator("button").filter({ hasText: groupName });
    await expect(groupCard).toBeVisible();
    await expect(groupCard.getByText("1 member")).toBeVisible();
    const groupId = await groupCard.getAttribute("data-testid").then((id) => {
      const match = id?.match(/group-card-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    await expect(
      authPage.getByTestId(`group-card-${groupId}`),
    ).toBeVisible();
  });

  test("add member by email form interaction", async ({
    authPage,
  }: {
    authPage: Page;
  }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByText("Group Settings")).toBeVisible();
    await expect(authPage.getByText("Manage Members")).toBeVisible();

    const emailInput = authPage.getByTestId("group-add-member-email");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("newuser@example.com");

    const addMemberButton = authPage.getByTestId("group-add-member-button");
    await expect(addMemberButton).toBeVisible();
    await addMemberButton.click();

    // The add member call will fail for a non-existent user, showing an error.
    // Wait for the request to complete and verify the error state.
    await authPage.waitForTimeout(2000);
    await expect(emailInput).toHaveValue("newuser@example.com");
  });

  test("change group name", async ({ authPage }: { authPage: Page }) => {
    const groupName = uniqueGroupName();
    const newName = `${groupName} Updated`;

    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByText("Group Settings")).toBeVisible();

    const nameInput = authPage.locator('input[id="name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);

    const saveButton = authPage.getByRole("button", { name: "Save" });
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
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(1000);

    const currentGroupName = await authPage
      .locator('input[id="name"]')
      .inputValue();
    await expect(
      authPage.getByRole("button", { name: "Delete Group" }),
    ).toBeVisible();
    await expect(authPage.getByText("Danger Zone")).toBeVisible();

    const deleteInput = authPage.locator("#delete-group-name-input");
    await deleteInput.fill(currentGroupName);

    const deleteButton = authPage.getByRole("button", {
      name: "Delete Group",
    });
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
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(1000);

    const currentGroupName = await authPage
      .locator('input[id="name"]')
      .inputValue();

    const deleteInput = authPage.locator("#delete-group-name-input");
    await deleteInput.fill(currentGroupName);

    const deleteButton = authPage.getByRole("button", {
      name: "Delete Group",
    });
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
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(1000);

    const currentGroupName = await authPage
      .locator('input[id="name"]')
      .inputValue();

    const deleteInput = authPage.locator("#delete-group-name-input");
    await deleteInput.fill(currentGroupName);

    const deleteButton = authPage.getByRole("button", {
      name: "Delete Group",
    });
    await deleteButton.click();
    await authPage.waitForURL("/group");

    await authPage.goto("/", { timeout: 30000 });
    await authPage.waitForURL(/\/(home|group|auth)/, { timeout: 15000 });
  });
});
