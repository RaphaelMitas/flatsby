import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { waitForHydration } from "../helpers/hydration";
import { requestCode } from "../helpers/sign-in-code";

// Chrome's virtual authenticator stands in for Touch ID and keeps the passkey for the whole test
async function addAuthenticator(page: Page) {
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
}

async function currentUserId(page: Page) {
  const response = await page.request.get("/api/auth/get-session");
  const body = (await response.json()) as { user: { id: string } } | null;
  return body?.user.id;
}

test.describe("Passkeys", () => {
  test("offered after a code sign-up, then signs back in and is managed in settings", async ({
    page,
  }) => {
    await addAuthenticator(page);
    const email = `passkey-${randomUUID()}@flatsby.test`;
    const code = await requestCode(page, email);
    await page.getByTestId("auth-code-input").fill(code);

    await waitForHydration(page.getByTestId("auth-name-continue"));
    await page.getByTestId("auth-name-input").fill("Passkey User");
    await page.getByTestId("auth-name-continue").click();

    await expect(page.getByTestId("auth-passkey-offer")).toBeVisible();
    await page.getByTestId("auth-passkey-create").click();
    await page.getByTestId("auth-passkey-continue").click();
    await expect(page).toHaveURL(/\/group/);
    const userId = await currentUserId(page);

    // This browser has used a passkey, so the login leads with it
    await page.context().clearCookies();
    await page.goto("/auth/login");
    await waitForHydration(page.getByTestId("auth-login-passkey-button"));
    await page.getByTestId("auth-login-passkey-button").click();
    await expect(page).toHaveURL(/\/group/);
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
    await addAuthenticator(page);
    const email = `passkey-${randomUUID()}@flatsby.test`;
    const code = await requestCode(page, email);
    await page.getByTestId("auth-code-input").fill(code);
    await waitForHydration(page.getByTestId("auth-name-continue"));
    await page.getByTestId("auth-name-input").fill("Declining User");
    await page.getByTestId("auth-name-continue").click();

    await page.getByTestId("auth-passkey-later").click();
    await expect(page).toHaveURL(/\/group/);

    await page.context().clearCookies();
    const again = await requestCode(page, email);
    await page.getByTestId("auth-code-input").fill(again);
    await expect(page).toHaveURL(/\/group/);
  });
});
