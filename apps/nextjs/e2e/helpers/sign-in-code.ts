import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForHydration } from "./hydration";

export async function requestCode(page: Page, email: string) {
  await page.goto("/auth/login");
  await waitForHydration(page.getByTestId("auth-login-email-button"));
  await page.getByTestId("auth-login-email-input").fill(email);
  await page.getByTestId("auth-login-email-button").click();
  await expect(page.getByTestId("auth-code-step")).toBeVisible();
  const response = await page.request.get(
    `/api/e2e/sign-in-code?email=${encodeURIComponent(email)}`,
  );
  expect(response.ok()).toBe(true);
  const { code } = (await response.json()) as { code: string };
  return code;
}
