import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

import { createAuthSession } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";
import { requestCode } from "../helpers/sign-in-code";

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

    await waitForHydration(page.getByTestId("auth-name-continue"));
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
    // A code pasted over half-typed digits replaces them
    const input = page.getByTestId("auth-code-input");
    await input.pressSequentially("12");
    await input.evaluate((element, text) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, `Code: ${code}`);
    await expect(page).toHaveURL(/\/home/);

    const session = await page.request.get("/api/auth/get-session");
    const body = (await session.json()) as { user: { id: string } };
    expect(body.user.id).toBe(existing.userId);
  });
});
