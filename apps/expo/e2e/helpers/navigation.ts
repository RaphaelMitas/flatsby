import { by, element, waitFor } from "detox";

import { tapIdUntilVisible, tapUntilVisible } from "./interaction";

async function tapNativeTab(tabTitle: string): Promise<void> {
  const tabButtons = element(by.type("_UITabButton"));
  const maxTabs = 4;

  for (let index = 0; index < maxTabs; index++) {
    try {
      const tab = tabButtons.atIndex(index);
      const attributes = await tab.getAttributes();
      const label =
        typeof attributes === "object" &&
        attributes !== null &&
        "label" in attributes &&
        typeof attributes.label === "string"
          ? attributes.label
          : "";

      if (!label.includes(tabTitle)) {
        continue;
      }

      await tab.tap({ x: 0.5, y: 0.5 });
      return;
    } catch {
      // Try the next tab slot.
    }
  }

  throw new Error(`Could not find native tab "${tabTitle}"`);
}

export async function goToTab(tabTitle: string): Promise<void> {
  try {
    await tapNativeTab(tabTitle);
    return;
  } catch {
    // Fall back to React tree text/labels.
  }

  try {
    await element(by.text(tabTitle)).atIndex(0).tap();
    return;
  } catch {
    await element(by.label(tabTitle)).atIndex(0).tap();
  }
}

export async function goToSettings(): Promise<void> {
  await goToTab("Settings");
  await waitFor(element(by.id("settings-logout")))
    .toExist()
    .withTimeout(10_000);
}

export async function goToGroupSettings(): Promise<void> {
  await goToSettings();
  await tapUntilVisible(
    by.id("settings-group-settings"),
    by.text("Group Details"),
    { timeout: 10_000 },
  );
}

export async function goToMembers(): Promise<void> {
  await goToGroupSettings();
  await tapUntilVisible(by.text("Members"), by.id("members-add-email-input"), {
    timeout: 10_000,
  });
}

export async function goToDangerZone(): Promise<void> {
  await goToSettings();
  await tapUntilVisible(
    by.id("settings-delete-account"),
    by.id("danger-delete-account-button"),
    { timeout: 10_000 },
  );
}

export async function goToExpenses(): Promise<void> {
  await goToTab("Expenses");
  try {
    await waitFor(element(by.id("expenses-add-fab")))
      .toExist()
      .withTimeout(10_000);
  } catch {
    await waitFor(element(by.id("expenses-empty-add-button")))
      .toExist()
      .withTimeout(10_000);
  }
}

export async function goToDebtSummary(): Promise<void> {
  await goToExpenses();
  await tapUntilVisible(
    by.id("expenses-debt-overview-button"),
    by.id("debts-title"),
    { timeout: 10_000 },
  );
}

export async function goToManageGroups(): Promise<void> {
  try {
    await waitFor(element(by.id("groups-create-group-button")))
      .toExist()
      .withTimeout(3_000);
    return;
  } catch {
    await goToSettings();
    await tapUntilVisible(
      by.text("Change Group"),
      by.id("groups-create-group-button"),
      { timeout: 10_000 },
    );
  }
}
