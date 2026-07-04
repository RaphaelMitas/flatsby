import { by, element, expect, waitFor } from "detox";

import { fillInput } from "./input";
import { tapIdUntilVisible, tapUntilVisible } from "./interaction";
import { goToGroupSettings, goToManageGroups } from "./navigation";

export const uniqueGroupName = () => `E2E Group ${Date.now()}`;

export async function selectBootstrapGroup(): Promise<void> {
  try {
    await waitFor(element(by.id("shopping-lists-create-button")))
      .toExist()
      .withTimeout(5_000);
    return;
  } catch {
    // Still on the group picker.
  }

  try {
    await waitFor(element(by.text("Select Group")))
      .toExist()
      .withTimeout(15_000);
    await tapUntilVisible(
      by.text("Select Group"),
      by.id("shopping-lists-create-button"),
      { timeout: 20_000, retries: 8 },
    );
    return;
  } catch {
    // API bootstrap group may not be listed yet — create one in the UI.
  }

  const name = uniqueGroupName();
  await submitCreateGroupForm(name);
  await selectGroupByName(name);
}

export async function openCreateGroupScreen(): Promise<void> {
  await tapIdUntilVisible(
    "groups-create-group-button",
    by.id("create-group-name-input"),
    { timeout: 15_000, tapTimeout: 3_000, retries: 5 },
  );
}

export async function submitCreateGroupForm(name: string): Promise<void> {
  await goToManageGroups();
  await openCreateGroupScreen();
  await fillInput("create-group-name-input", name);
  await element(by.id("create-group-submit-button")).tap();
  await waitFor(element(by.text(name)))
    .toExist()
    .withTimeout(15_000);
}

export async function selectGroupByName(name: string): Promise<void> {
  await waitFor(element(by.text(name)))
    .toExist()
    .withTimeout(15_000);

  const rowActions = [
    () => element(by.id(`groups-item-select-${name}`)),
    () => element(by.text("Select Group").withAncestor(by.text(name))),
    () => element(by.text("Go to Group").withAncestor(by.text(name))),
  ];

  for (const getTarget of rowActions) {
    try {
      await getTarget().tap();
      await waitFor(element(by.id("shopping-lists-create-button")))
        .toExist()
        .withTimeout(15_000);
      return;
    } catch {
      // Try the next locator strategy.
    }
  }

  await tapUntilVisible(
    by.text("Select Group"),
    by.id("shopping-lists-create-button"),
    { timeout: 20_000, tapTimeout: 5_000, retries: 10 },
  );
}

export async function createAndSelectGroup(name: string): Promise<void> {
  await submitCreateGroupForm(name);
  await selectGroupByName(name);
}

export async function deleteCurrentGroup(groupName: string): Promise<void> {
  await goToGroupSettings();
  await tapUntilVisible(
    by.id("group-settings-delete-group"),
    by.id("delete-confirmation-modal"),
    { timeout: 10_000 },
  );
  await fillInput("delete-confirmation-input", groupName);
  await element(by.id("delete-confirmation-button")).tap();
  await waitFor(element(by.text("Your Groups")))
    .toExist()
    .withTimeout(15_000);
}

export async function expectGroupVisible(groupName: string): Promise<void> {
  await expect(element(by.text(groupName))).toExist();
  await expect(element(by.text("1 member"))).toExist();
}
