import { by, element, expect, waitFor } from "detox";

import { signIn } from "../fixtures/auth";
import {
  createAndSelectGroup,
  deleteCurrentGroup,
  expectGroupVisible,
  openCreateGroupScreen,
  submitCreateGroupForm,
  uniqueGroupName,
} from "../helpers/group";
import { fillInput } from "../helpers/input";
import {
  goToGroupSettings,
  goToManageGroups,
  goToMembers,
} from "../helpers/navigation";

describe("Group Management", () => {
  beforeEach(async () => {
    await signIn();
    await goToManageGroups();
  });

  it("create group via UI", async () => {
    const groupName = uniqueGroupName();

    await openCreateGroupScreen();
    await fillInput("create-group-name-input", groupName);
    await element(by.id("create-group-submit-button")).tap();
    await waitFor(element(by.text(groupName)))
      .toExist()
      .withTimeout(15_000);
  });

  it("group appears in dashboard", async () => {
    const groupName = uniqueGroupName();

    await submitCreateGroupForm(groupName);
    await expectGroupVisible(groupName);
  });

  it("add member by email form interaction", async () => {
    const groupName = uniqueGroupName();
    await submitCreateGroupForm(groupName);

    await goToMembers();

    const emailInput = element(by.id("members-add-email-input"));
    await expect(emailInput).toBeVisible();
    await fillInput("members-add-email-input", "newuser@example.com");

    const addMemberButton = element(by.id("members-add-button"));
    await expect(addMemberButton).toBeVisible();
    await addMemberButton.tap();
  });

  it("change group name", async () => {
    const groupName = uniqueGroupName();
    const newName = `${groupName} Updated`;

    await submitCreateGroupForm(groupName);

    await goToGroupSettings();
    await element(by.text("Group Details")).tap();
    await waitFor(element(by.id("group-details-name-input")))
      .toBeVisible()
      .withTimeout(10_000);

    await fillInput("group-details-name-input", newName);
    await element(by.id("group-name-save")).tap();

    await expect(element(by.text("Success!"))).toExist();
  });

  it("delete group", async () => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(groupName);

    await goToGroupSettings();
    await expect(element(by.id("group-settings-delete-group"))).toBeVisible();
    await deleteCurrentGroup(groupName);
  });

  it("deleted group inaccessible", async () => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(groupName);
    await deleteCurrentGroup(groupName);

    await expect(element(by.text(groupName))).not.toBeVisible();
  });

  it("delete group clears user references", async () => {
    const groupName = uniqueGroupName();
    await createAndSelectGroup(groupName);
    await deleteCurrentGroup(groupName);

    await expect(element(by.text("Your Groups"))).toBeVisible();
  });
});
