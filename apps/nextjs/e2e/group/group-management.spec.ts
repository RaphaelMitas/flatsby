import type { Browser, Page } from "@playwright/test";

import { createAuthSession, expect, test } from "../fixtures/auth";
import { createTestExpense } from "../helpers/expenses";
import {
  addPlaceholder,
  createAndSelectGroup,
  deleteCurrentGroup,
  groupRefetched,
  submitCreateGroupForm,
  uniqueGroupName,
} from "../helpers/group";
import { waitForHydration } from "../helpers/hydration";

async function newInvitee(
  browser: Browser,
  baseURL: string | undefined,
  params?: Record<string, string>,
) {
  const page = await (await browser.newContext()).newPage();
  const user = await createAuthSession(page, baseURL, params);
  return { page, user };
}

async function joinAsNewUser(
  browser: Browser,
  baseURL: string | undefined,
  code: string,
) {
  const invitee = await newInvitee(browser, baseURL);
  await invitee.page.goto(`/join/${code}`);
  await confirmJoin(invitee.page);
  return invitee;
}

async function confirmJoin(page: Page) {
  const joinButton = page.getByTestId("join-invite-button");
  await waitForHydration(joinButton);
  await joinButton.click();
  await page.waitForURL("/home");
}

async function openInvite(page: Page) {
  await page.goto("/group/settings");
  const inviteButton = page.getByTestId("group-invite-button");
  await waitForHydration(inviteButton);
  await inviteButton.click();
  const code = page.getByTestId("group-invite-code");
  await expect(code).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  return code.innerText();
}

async function claimPlaceholder(
  browser: Browser,
  baseURL: string | undefined,
  code: string,
  placeholder: string,
  name: string,
) {
  const invitee = await newInvitee(browser, baseURL, { name });
  const { page } = invitee;
  await page.goto(`/join/${code}`);
  await expect(page.getByTestId("join-claim-new")).toBeChecked();
  const option = page.getByTestId(/^join-claim-option-\d+$/);
  await expect(option).toHaveCount(1);
  await waitForHydration(option);
  await option.check();
  await expect(page.getByTestId("join-invite-button")).toHaveText(
    `Join as ${placeholder}`,
  );
  await confirmJoin(page);
  return invitee;
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

    const { page: inviteePage, user: invitee } = await newInvitee(
      browser,
      baseURL,
    );
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
    await confirmJoin(inviteePage);

    await authPage.goto("/group/settings");
    await expect(authPage.getByText(invitee.email)).toBeVisible();
    await inviteePage.context().close();
  });

  test("removed member can't rejoin with the old code", async ({
    authPage,
    browser,
    baseURL,
  }) => {
    await createAndSelectGroup(authPage, uniqueGroupName());
    const code = await openInvite(authPage);

    const { page: inviteePage, user: invitee } = await joinAsNewUser(
      browser,
      baseURL,
      code,
    );

    await authPage.goto("/group/settings");
    const memberActions = authPage
      .locator("#manage-members")
      .filter({ hasText: invitee.email })
      .getByRole("button");
    await waitForHydration(memberActions);
    await memberActions.click();
    await authPage.getByRole("button", { name: "Remove" }).click();
    await expect(authPage.getByText(invitee.email)).not.toBeVisible();

    await inviteePage.goto(`/join/${code}`);
    await expect(inviteePage.getByTestId("join-invite-expired")).toBeVisible();
    await inviteePage.context().close();
  });

  test("a placeholder's person takes over their spot through the invite", async ({
    authPage,
    browser,
    baseURL,
  }) => {
    await createAndSelectGroup(authPage, uniqueGroupName());
    await addPlaceholder(authPage, "Anna");
    const code = await openInvite(authPage);

    const { page: annaPage, user: anna } = await claimPlaceholder(
      browser,
      baseURL,
      code,
      "Anna",
      "Anna Schmitt",
    );

    await authPage.goto("/group/settings");
    await expect(authPage.getByText("Anna Schmitt")).toBeVisible();
    await expect(authPage.getByText(anna.email)).toBeVisible();
    await expect(authPage.getByTestId("placeholder-row-Anna")).toHaveCount(0);
    await annaPage.context().close();
  });

  test("an admin turns a wrong claim back into the placeholder", async ({
    authPage,
    browser,
    baseURL,
  }) => {
    await createAndSelectGroup(authPage, uniqueGroupName());
    await addPlaceholder(authPage, "Anna");
    const code = await openInvite(authPage);

    const { page: kevinPage, user: kevin } = await claimPlaceholder(
      browser,
      baseURL,
      code,
      "Anna",
      "Kevin Müller",
    );

    await authPage.goto("/group/settings");
    const memberActions = authPage
      .locator("#manage-members")
      .filter({ hasText: kevin.email })
      .getByRole("button");
    await waitForHydration(memberActions);
    await memberActions.click();
    await expect(authPage.getByText("Took Anna's spot")).toBeVisible();
    await authPage.getByTestId("member-action-undo-claim").click();
    const settled = groupRefetched(authPage);
    await authPage.getByTestId("member-undo-claim-confirm").click();

    await expect(authPage.getByTestId("placeholder-row-Anna")).toBeVisible();
    await expect(authPage.getByText(kevin.email)).not.toBeVisible();
    await settled;
    await authPage.reload();
    await expect(authPage.getByTestId("placeholder-row-Anna")).toBeVisible();
    await kevinPage.context().close();
  });

  test("members who aren't admins can't invite", async ({
    authPage,
    browser,
    baseURL,
  }) => {
    await createAndSelectGroup(authPage, uniqueGroupName());
    const code = await openInvite(authPage);

    const { page: memberPage } = await joinAsNewUser(browser, baseURL, code);

    await memberPage.goto("/group/settings");
    await expect(
      memberPage.getByTestId("group-manage-members-title"),
    ).toBeVisible();
    await expect(memberPage.getByTestId("group-invite-button")).toHaveCount(0);
    await memberPage.context().close();
  });

  test("reset link kills the old code and its link card", async ({
    authPage,
    request,
  }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);
    const oldCode = await openInvite(authPage);

    const crawl = async () => {
      const response = await request.get(`/join/${oldCode}`, {
        headers: {
          "user-agent": "WhatsApp/2.24.20.79 A",
          "accept-language": "en",
        },
      });
      const html = await response.text();
      const head = html.slice(0, html.indexOf("</head>"));
      const og = (property: string) =>
        head.match(
          new RegExp(`<meta property="og:${property}" content="([^"]*)"`),
        )?.[1];
      return { title: og("title"), image: og("image") };
    };

    const live = await crawl();
    expect(live.title).toContain(`invited you to ${groupName}`);
    const { pathname, search } = new URL(live.image ?? "");
    const image = await request.get(`${pathname}${search}`);
    expect(image.headers()["content-type"]).toBe("image/png");
    // WhatsApp drops og:images over 600KB
    expect((await image.body()).length).toBeLessThan(600_000);

    await authPage.getByRole("button", { name: "Reset link" }).click();
    await expect(authPage.getByTestId("group-invite-code")).not.toHaveText(
      oldCode,
    );

    expect((await crawl()).title).toBe("This invite has expired");
    await authPage.goto(`/join/${oldCode}`);
    await expect(authPage.getByTestId("join-invite-expired")).toBeVisible();
  });

  test("switching groups from the home switcher", async ({ authPage }) => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(authPage, groupName);

    const switcher = authPage.getByTestId("home-group-switcher");
    await waitForHydration(switcher);
    await expect(switcher).toContainText(groupName);

    await switcher.click();
    await authPage.getByRole("menuitem", { name: /E2E Test Group/ }).click();

    await expect(switcher).toContainText("E2E Test Group");
    await expect(switcher).not.toContainText(groupName);
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

  test("delete group with expenses", async ({ authPage, testUser }) => {
    const groupId = await createAndSelectGroup(authPage, uniqueGroupName());
    await createTestExpense(authPage);

    await deleteCurrentGroup(authPage);

    await authPage.reload();
    await expect(
      authPage.getByTestId(`group-card-${testUser.groupId}`),
    ).toBeVisible();
    await expect(authPage.getByTestId(`group-card-${groupId}`)).toHaveCount(0);
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
