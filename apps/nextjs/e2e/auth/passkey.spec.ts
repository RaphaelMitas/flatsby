import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { waitForHydration } from "../helpers/hydration";
import { currentUserId, requestCode } from "../helpers/sign-in-code";

async function signInReturning(page: Page) {
  const email = `passkey-${randomUUID()}@flatsby.test`;
  const response = await page.request.post(
    `/api/e2e/create-session?returning=1&email=${encodeURIComponent(email)}`,
  );
  expect(response.ok()).toBe(true);
  const code = await requestCode(page, email);
  await page.getByTestId("auth-code-input").fill(code);
  return email;
}

test.describe("Passkeys", () => {
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

  test("not offered on a code sign-up", async ({ page }) => {
    const code = await requestCode(
      page,
      `passkey-${randomUUID()}@flatsby.test`,
    );
    await page.getByTestId("auth-code-input").fill(code);
    await expect(page).toHaveURL(/\/welcome/);
  });

  test("offered on a later code sign-in, then signs back in and is managed in settings", async ({
    page,
  }) => {
    await signInReturning(page);
    await expect(page.getByTestId("auth-passkey-offer")).toBeVisible();
    await page.getByTestId("auth-passkey-create").click();
    await page.getByTestId("auth-passkey-continue").click();
    await expect(page).toHaveURL(/\/home/);
    const userId = await currentUserId(page);

    await page.context().clearCookies();
    await page.goto("/auth/login");
    await waitForHydration(page.getByTestId("auth-login-passkey-button"));
    await page.getByTestId("auth-login-passkey-button").click();
    await expect(page).toHaveURL(/\/home/);
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
    const email = await signInReturning(page);
    await page.getByTestId("auth-passkey-later").click();
    await expect(page).toHaveURL(/\/home/);

    await page.context().clearCookies();
    const again = await requestCode(page, email);
    await page.getByTestId("auth-code-input").fill(again);
    await expect(page).toHaveURL(/\/home/);
  });
});
