import { by, element, expect } from "detox";

import { launchFreshApp, waitForLoginScreen } from "../fixtures/session";

describe("Login page", () => {
  beforeEach(async () => {
    await launchFreshApp();
    await waitForLoginScreen();
  });

  it("renders with OAuth buttons", async () => {
    await expect(element(by.id("login-screen"))).toBeVisible();
    await expect(element(by.id("sign-in-google-button"))).toBeVisible();
    await expect(element(by.id("sign-in-apple-button"))).toBeVisible();
  });

  it("has links to legal pages", async () => {
    try {
      await expect(element(by.id("auth-login-legal-notice-link"))).toExist();
      return;
    } catch {
      // Pre-rebuild binaries may not expose nested legal link testIDs yet.
    }

    await expect(element(by.text("Legal Notice"))).toExist();
  });

  it("shows tagline", async () => {
    await expect(
      element(by.text("Manage your daily life with your flatmates.")),
    ).toBeVisible();
  });
});
