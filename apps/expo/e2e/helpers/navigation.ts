import { by, device, element, waitFor } from "detox";

import { tapIdUntilVisible, tapUntilVisible } from "./interaction";

type Matcher = Parameters<typeof element>[0];

const EXPENSES_SCREEN_MARKERS: Matcher[] = [
  by.id("expenses-debt-overview-button"),
  by.id("expenses-empty-add-button"),
  by.id("expenses-add-fab"),
  by.text("No expenses yet"),
];

const TAB_SCREEN_MARKERS: Record<string, Matcher[]> = {
  Home: [by.id("shopping-lists-create-button"), by.id("home-group-picker-button")],
  Expenses: EXPENSES_SCREEN_MARKERS,
  Settings: [by.id("settings-logout")],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tapNativeTab(tabTitle: string): Promise<void> {
  const tabButtons = element(by.type("_UITabButton"));
  const maxTabs = 5;

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

async function tapTabButton(tabTitle: string): Promise<void> {
  const tabTestIds: Record<string, string> = {
    Home: "tab-home",
    Expenses: "tab-expenses",
    Settings: "tab-settings",
  };

  const tabTestId = tabTestIds[tabTitle];
  if (tabTestId) {
    try {
      await element(by.id(tabTestId)).tap({ x: 0.5, y: 0.5 });
      return;
    } catch {
      // Fall back to native tab discovery.
    }
  }

  try {
    await tapNativeTab(tabTitle);
    return;
  } catch {
    // Fall back to React tree text/labels.
  }

  try {
    await element(by.text(tabTitle)).atIndex(0).tap({ x: 0.5, y: 0.5 });
    return;
  } catch {
    await element(by.label(tabTitle)).atIndex(0).tap({ x: 0.5, y: 0.5 });
  }
}

async function waitForAnyVisible(
  markers: Matcher[],
  timeout: number,
): Promise<void> {
  for (const marker of markers) {
    try {
      await waitFor(element(marker)).toBeVisible().withTimeout(timeout);
      return;
    } catch {
      // Try the next marker.
    }
  }

  await waitFor(element(markers[0]!)).toBeVisible().withTimeout(timeout);
}

async function goToTabUntilVisible(
  tabTitle: string,
  screenMarkers: Matcher[],
  { timeout = 15_000, retries = 10 } = {},
): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    await tapTabButton(tabTitle);

    try {
      await waitForAnyVisible(screenMarkers, 3_000);
      return;
    } catch {
      await sleep(400);
    }
  }

  await waitForAnyVisible(screenMarkers, timeout);
}

export async function goToTab(tabTitle: string): Promise<void> {
  const markers = TAB_SCREEN_MARKERS[tabTitle];
  if (markers) {
    await goToTabUntilVisible(tabTitle, markers);
    return;
  }

  await tapTabButton(tabTitle);
}

export async function goToSettings(): Promise<void> {
  await goToTab("Settings");
}

export async function goToGroupSettings(): Promise<void> {
  await goToSettings();
  await tapUntilVisible(
    by.id("settings-group-settings"),
    by.text("Group Details"),
    { timeout: 15_000 },
  );
}

export async function goToMembers(): Promise<void> {
  await goToGroupSettings();
  await tapUntilVisible(by.text("Members"), by.id("members-add-email-input"), {
    timeout: 15_000,
  });
}

export async function goToDangerZone(): Promise<void> {
  await goToSettings();
  await tapUntilVisible(
    by.id("settings-delete-account"),
    by.id("danger-delete-account-button"),
    { timeout: 15_000 },
  );
}

async function openExpensesViaDashboardLink(): Promise<void> {
  await goToTab("Home");

  try {
    await tapIdUntilVisible(
      "nav-expenses-link",
      by.id("expenses-debt-overview-button"),
      { timeout: 10_000, tapTimeout: 4_000, retries: 8 },
    );
    return;
  } catch {
    await tapUntilVisible(
      by.text("Expenses"),
      by.id("expenses-debt-overview-button"),
      { timeout: 10_000, tapTimeout: 4_000, retries: 8 },
    );
  }
}

export async function goToExpenses(): Promise<void> {
  try {
    await device.openURL({ url: "flatsby:///(tabs)/expenses" });
    await waitForAnyVisible(EXPENSES_SCREEN_MARKERS, 10_000);
    return;
  } catch {
    // Fall back to tab-bar navigation.
  }

  const tabs = element(by.type("_UITabButton"));
  const strategies = [
    () => element(by.id("tab-expenses")).tap({ x: 0.5, y: 0.5 }),
    () => tabs.atIndex(1).tap({ x: 0.5, y: 0.5 }),
    () => tabs.atIndex(2).tap({ x: 0.5, y: 0.5 }),
    () => tapTabButton("Expenses"),
  ];

  for (let attempt = 0; attempt < 8; attempt++) {
    for (const tap of strategies) {
      try {
        await tap();
      } catch {
        continue;
      }

      try {
        await waitForAnyVisible(EXPENSES_SCREEN_MARKERS, 2_500);
        return;
      } catch {
        // Try the next tap strategy.
      }
    }

    await sleep(400);
  }

  try {
    await openExpensesViaDashboardLink();
    return;
  } catch {
    await waitForAnyVisible(EXPENSES_SCREEN_MARKERS, 15_000);
  }
}

export async function goToDebtSummary(): Promise<void> {
  await goToExpenses();
  await tapUntilVisible(
    by.id("expenses-debt-overview-button"),
    by.id("debts-title"),
    { timeout: 15_000 },
  );
}

export async function goToManageGroups(): Promise<void> {
  try {
    await waitFor(element(by.id("groups-create-group-button")))
      .toBeVisible()
      .withTimeout(3_000);
    return;
  } catch {
    await goToSettings();
    await tapUntilVisible(
      by.text("Change Group"),
      by.id("groups-create-group-button"),
      { timeout: 15_000 },
    );
  }
}
