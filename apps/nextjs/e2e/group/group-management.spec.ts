import type { Page } from "@playwright/test";

import { createAuthSession, expect, test } from "../fixtures/auth";
import {
  createAndSelectGroup,
  deleteCurrentGroup,
  submitCreateGroupForm,
  uniqueGroupName,
} from "../helpers/group";
import { waitForHydration } from "../helpers/hydration";

async function openInvite(page: Page) {
  await page.goto("/group/settings");
  const inviteButton = page.getByTestId("group-invite-button");
  await waitForHydration(inviteButton);
  await inviteButton.click();
  const code = page.getByTestId("group-invite-code");
  await expect(code).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  return code.innerText();
}

test.describe("Group Management", () => {
  test("create group via UI", async ({ authPage }) => {
    const groupName = uniqueGroupName();

    await authPage.goto("/group/create");
    await expect(authPage.getByTestId("group-create-title")).toContainText(
      "Create a Group",
    );

    await submitCreateGroupForm(authPage, groupName);
  });

  test("group appears in dashboard", async ({ authPage }) => {
    const groupName = uniqueGroupName();

    await submitCreateGroupForm(authPage, groupName);

    await authPage.goto("/group");
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

  test("second user joins through the invite code", async ({
    authPage,
    browser,
    baseURL,
  }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);
    const code = await openInvite(authPage);

    const inviteePage = await (await browser.newContext()).newPage();
    const invitee = await createAuthSession(inviteePage, baseURL);
    await inviteePage.goto("/group");
    const joinButton = inviteePage.getByTestId("group-join-with-code-button");
    await waitForHydration(joinButton);
    await joinButton.click();
    await inviteePage
      .getByTestId("group-join-code-input")
      .fill(code.replace("-", ""));
    await inviteePage.getByRole("button", { name: "Continue" }).click();

    await expect(
      inviteePage.getByTestId("join-invite-group-name"),
    ).toContainText(groupName);
    await inviteePage.getByTestId("join-invite-button").click();
    await inviteePage.waitForURL("/home");

    await authPage.goto("/group/settings");
    await expect(authPage.getByText(invitee.email)).toBeVisible();
  });

  test("reset link kills the old code", async ({ authPage }) => {
    await createAndSelectGroup(authPage, uniqueGroupName());
    const oldCode = await openInvite(authPage);

    await authPage.getByRole("button", { name: "Reset link" }).click();
    await expect(authPage.getByTestId("group-invite-code")).not.toHaveText(
      oldCode,
    );

    await authPage.goto(`/join/${oldCode}`);
    await expect(authPage.getByTestId("join-invite-expired")).toBeVisible();
  });

  test("change group name", async ({ authPage }) => {
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
  // test("non-admin cannot invite", () => {});
  // test("non-admin cannot remove other members", () => {});

  test("delete group", async ({ authPage }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    await authPage.goto("/group/settings");
    await expect(authPage.getByTestId("group-name-input")).toBeVisible();
    await expect(
      authPage.getByTestId("group-delete-confirm-button"),
    ).toBeVisible();
    await expect(authPage.getByTestId("group-danger-zone-title")).toBeVisible();

    await deleteCurrentGroup(authPage);
  });

  test("deleted group inaccessible", async ({ authPage }) => {
    const groupName = uniqueGroupName();
    const groupId = await createAndSelectGroup(authPage, groupName);

    await deleteCurrentGroup(authPage);

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

  test("delete group clears user references", async ({ authPage }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    await deleteCurrentGroup(authPage);

    await authPage.goto("/", { timeout: 30000 });
    await authPage.waitForURL(/\/(home|group|auth)/, { timeout: 15000 });
  });
});
