import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

import { createAuthSession } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";
import { currentUserId, requestCode } from "../helpers/sign-in-code";

test.describe("Email code sign-in", () => {
  test("signs up a new address and creates the flat in one step", async ({
    page,
  }) => {
    const email = `code-${randomUUID()}@flatsby.test`;
    const code = await requestCode(page, email);

    const wrong = code === "000000" ? "111111" : "000000";
    await page.getByTestId("auth-code-input").fill(wrong);
    await expect(page.getByTestId("auth-code-error")).toBeVisible();

    await page.getByTestId("auth-code-input").fill(code);
    // A creator names themselves here, not on a separate name step
    await expect(page).toHaveURL(/\/welcome/);
    const nameInput = page.getByTestId("onboarding-name-input");
    await expect(nameInput).toHaveValue("");
    await waitForHydration(page.getByTestId("onboarding-create"));
    await nameInput.fill("Code User");
    await expect(page.getByTestId("onboarding-group-input")).toHaveValue(
      "Code's flat",
    );
    await page.getByTestId("onboarding-flatmates-input").fill("Lena und Tim");
    await page.getByTestId("onboarding-create").click();

    await expect(page).toHaveURL(/\/home/);
    const card = page.getByTestId("invite-flatmates-card");
    await expect(card).toContainText("Code's flat is set up");
    await expect(card.getByTestId(/^invite-card-send-\d+$/)).toHaveCount(2);
    await expect(card.getByTestId("invite-card-preview")).toContainText(
      "Lena, I've already added you",
    );
    await expect(card.getByTestId("invite-card-code")).toHaveText(
      /^[0-9A-Z]{4}-[0-9A-Z]{4}$/,
    );
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

    expect(await currentUserId(page)).toBe(existing.userId);
  });
});
