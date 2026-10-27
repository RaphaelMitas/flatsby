import { describe, expect, it } from "vitest";

import { callbackOutcome, loginErrorCode } from "./login";

const redirect = (query: string) =>
  new URL(`https://www.flatsby.com/api/auth/error${query}`);

describe("callbackOutcome", () => {
  it("reads a redirect without an error as a sign-in", () => {
    expect(callbackOutcome(new URL("flatsby:///?cookie=x"))).toEqual({
      event: "login_succeeded",
    });
  });

  it.each(["access_denied", "user_cancelled_authorize"])(
    "reads %s as a cancel on the provider's page",
    (code) => {
      expect(callbackOutcome(redirect(`?error=${code}`))).toEqual({
        event: "login_cancelled",
        stage: "provider",
      });
    },
  );

  it("reads any other error as a failed callback", () => {
    expect(callbackOutcome(redirect("?error=state_not_found"))).toEqual({
      event: "login_failed",
      stage: "callback",
      error_code: "state_not_found",
    });
  });
});

describe("loginErrorCode", () => {
  it("keeps code-shaped values, lowercased", () => {
    expect(loginErrorCode("PROVIDER_NOT_FOUND")).toBe("provider_not_found");
  });

  it.each([
    "someone@example.com",
    "free text from a crafted link",
    "x".repeat(65),
    "",
    null,
  ])("replaces %j with other", (code) => {
    expect(loginErrorCode(code)).toBe("other");
  });
});
