import { by, element, expect } from "detox";

import { launchFreshApp, waitForLoginScreen } from "../fixtures/session";

describe("App launch", () => {
  it("shows the login screen on a fresh launch", async () => {
    await launchFreshApp();
    await waitForLoginScreen();
    await expect(element(by.id("login-screen"))).toBeVisible();
  });
});
