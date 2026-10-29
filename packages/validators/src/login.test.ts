import { describe, expect, it } from "vitest";

import {
  callbackOutcome,
  codeFromText,
  isRetryableCodeError,
  loginAttemptSchema,
  loginErrorCode,
  signInCodeError,
} from "./login";

const redirect = (query: string) =>
  new URL(`https://www.flatsby.com/api/auth/error${query}`);

describe("callbackOutcome", () => {
  it("reads a redirect without an error as a sign-in", () => {
    expect(callbackOutcome(new URL("flatsby:///"))).toEqual({
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

describe("loginAttemptSchema", () => {
  const attemptId = "019a2b3c-4d5e-7f00-8a00-000000000000";

  it.each(["", "someone@example.com"])(
    "keeps the attempt when the distinct id is %j",
    (distinctId) => {
      expect(loginAttemptSchema.parse({ attemptId, distinctId })).toEqual({
        attemptId,
        distinctId: undefined,
      });
    },
  );
});

describe("signInCodeError", () => {
  it.each([
    [{ code: "INVALID_OTP", status: 400 }, "auth.code.invalid"],
    [{ code: "OTP_EXPIRED", status: 400 }, "auth.code.expired"],
    [{ code: "TOO_MANY_ATTEMPTS", status: 403 }, "auth.code.tooManyAttempts"],
    [{ status: 429 }, "auth.code.tooManyRequests"],
    [{ code: "TOO_MANY_CODES", status: 429 }, "auth.code.tooManyCodes"],
    [{ code: "SOMETHING_ELSE", status: 500 }, "auth.code.failed"],
  ])("maps %j to %s", (error, key) => {
    expect(signInCodeError(error)).toBe(key);
  });

  it("keeps the code usable after a wrong guess or a rate limit", () => {
    expect(isRetryableCodeError({ code: "INVALID_OTP", status: 400 })).toBe(
      true,
    );
    expect(isRetryableCodeError({ status: 429 })).toBe(true);
    expect(isRetryableCodeError({ code: "OTP_EXPIRED", status: 400 })).toBe(
      false,
    );
    expect(
      isRetryableCodeError({ code: "TOO_MANY_ATTEMPTS", status: 403 }),
    ).toBe(false);
  });
});

describe("codeFromText", () => {
  it.each([
    ["123456", "123456"],
    ["Code: 123456", "123456"],
    ["Sign in:\n\n123456\n\nThe code expires in 5 minutes.", "123456"],
    ["12884568", "884568"],
    ["12", "12"],
  ])("reads %j as %j", (text, code) => {
    expect(codeFromText(text)).toBe(code);
  });
});
