import { by, device, element, waitFor } from "detox";

import { tapUntilVisible } from "../helpers/interaction";

export async function launchFreshApp(): Promise<void> {
  await device.clearKeychain();
  await device.launchApp({
    newInstance: true,
    delete: true,
    launchArgs: { detoxEnableSynchronization: "false" },
  });
}

export async function waitForLoginScreen(): Promise<void> {
  await waitFor(element(by.id("login-screen")))
    .toBeVisible()
    .withTimeout(15_000);
}

export async function signInAsFreshUser(): Promise<void> {
  await launchFreshApp();
  await waitForLoginScreen();
  await tapUntilVisible(by.id("sign-in-e2e-button"), by.text("Your Groups"), {
    timeout: 30_000,
    tapTimeout: 5_000,
  });
  await waitFor(element(by.id("e2e-login-error")))
    .not.toBeVisible()
    .withTimeout(5_000);
}
