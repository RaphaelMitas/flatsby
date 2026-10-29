import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { createAuthSession } from "../fixtures/auth";

async function requestCode(page: Page, email: string) {
  await page.goto("/auth/login");
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

test.describe("Email code sign-in", () => {
  test("signs up a new address and asks for a name", async ({ page }) => {
    const email = `code-${randomUUID()}@flatsby.test`;
    const code = await requestCode(page, email);

    const wrong = code === "000000" ? "111111" : "000000";
    await page.getByTestId("auth-code-input").fill(wrong);
    await expect(page.getByTestId("auth-code-error")).toBeVisible();

    await page.getByTestId("auth-code-input").fill(code);
    await expect(page).toHaveURL(/\/auth\/name/);
    await expect(page.getByTestId("auth-name-input")).toHaveValue(
      email.split("@")[0] ?? "",
    );

    await page.getByTestId("auth-name-input").fill("Code User");
    await page.getByTestId("auth-name-continue").click();
    // A new account has no household yet, so the app offers to create or join one
    await expect(page).toHaveURL(/\/group/);
  });

  test("signs an existing user into the same account", async ({
    page,
    baseURL,
  }) => {
    const existing = await createAuthSession(page, baseURL);
    await page.context().clearCookies();

    const code = await requestCode(page, existing.email);
    await page.getByTestId("auth-code-input").fill(code);
    await expect(page).toHaveURL(/\/home/);

    const session = await page.request.get("/api/auth/get-session");
    const body = (await session.json()) as { user: { id: string } };
    expect(body.user.id).toBe(existing.userId);
  });
});
