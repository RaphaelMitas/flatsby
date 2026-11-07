import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { waitForHydration } from "../helpers/hydration";
import { currentUserId, requestCode } from "../helpers/sign-in-code";

async function signUp(page: Page) {
  const email = `passkey-${randomUUID()}@flatsby.test`;
  const code = await requestCode(page, email);
  await page.getByTestId("auth-code-input").fill(code);
  return email;
}

test.describe("Passkeys", () => {
  // Chrome's virtual authenticator stands in for Touch ID and keeps the passkey for the whole test
  test.beforeEach(async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
  });

  test("offered after a code sign-up, then signs back in and is managed in settings", async ({
    page,
  }) => {
    await signUp(page);
    await expect(page.getByTestId("auth-passkey-offer")).toBeVisible();
    await page.getByTestId("auth-passkey-create").click();
    await page.getByTestId("auth-passkey-continue").click();
    await expect(page).toHaveURL(/\/welcome/);
    const userId = await currentUserId(page);

    // This browser has used a passkey, so the login leads with it
    await page.context().clearCookies();
    await page.goto("/auth/login");
    await waitForHydration(page.getByTestId("auth-login-passkey-button"));
    await page.getByTestId("auth-login-passkey-button").click();
    await expect(page).toHaveURL(/\/welcome/);
    expect(await currentUserId(page)).toBe(userId);

    await page.goto("/user-settings");
    const row = page.getByTestId("settings-passkey");
    await expect(row).toHaveCount(1);
    await waitForHydration(page.getByTestId("settings-passkey-rename"));
    await page.getByTestId("settings-passkey-rename").click();
    await page.getByTestId("settings-passkey-name-input").fill("Work laptop");
    await page.getByTestId("settings-passkey-name-input").press("Enter");
    await expect(row).toContainText("Work laptop");

    await page.getByTestId("settings-passkey-remove").click();
    await page.getByTestId("settings-passkey-remove-confirm").click();
    await expect(row).toHaveCount(0);
  });

  test("a declined offer stays declined on this browser", async ({ page }) => {
    const email = await signUp(page);
    await page.getByTestId("auth-passkey-later").click();
    await expect(page).toHaveURL(/\/welcome/);
    // Without a group there is no settings page, so onboarding offers the way out
    await waitForHydration(page.getByTestId("onboarding-sign-out"));
    await page.getByTestId("onboarding-sign-out").click();
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.context().clearCookies();
    const again = await requestCode(page, email);
    await page.getByTestId("auth-code-input").fill(again);
    await expect(page).toHaveURL(/\/welcome/);
  });
});
