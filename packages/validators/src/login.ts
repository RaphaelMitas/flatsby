import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

export const loginProviderSchema = z.enum(["google", "apple"]);
export type LoginProvider = z.infer<typeof loginProviderSchema>;

export const loginMethodSchema = z.enum([
  ...loginProviderSchema.options,
  "email",
]);

export const loginFailureStageSchema = z.enum(["start", "code"]);
export type LoginFailureStage = z.infer<typeof loginFailureStageSchema>;

export const SIGN_IN_CODE_LENGTH = 6;
export const SIGN_IN_CODE_GROUP = SIGN_IN_CODE_LENGTH / 2;
export const SIGN_IN_CODE_RESEND_SECONDS = 30;
export const SIGN_IN_CODE_TTL_MINUTES = 5;
export const SIGN_IN_CODE_TTL_SECONDS = SIGN_IN_CODE_TTL_MINUTES * 60;

export const digitsOnly = (text: string) => text.replace(/\D/g, "");

// A pasted email carries other digits, so a standalone six-digit run beats the last six digits
export function codeFromText(text: string) {
  // No lookbehind: Safari before 16.4 throws on it
  const standalone = new RegExp(
    `(?:^|\\D)(\\d{${SIGN_IN_CODE_LENGTH}})(?!\\d)`,
  );
  return (
    standalone.exec(text)?.[1] ?? digitsOnly(text).slice(-SIGN_IN_CODE_LENGTH)
  );
}

export const codeSlotGroups = (length: number, groupSize: number) =>
  Array.from({ length: length / groupSize }, (_, group) =>
    Array.from({ length: groupSize }, (_, i) => group * groupSize + i),
  );

export interface AuthError {
  code?: string;
  status: number;
}

const CODE_ERRORS = new Map([
  ["TOO_MANY_CODES", msg("auth.code.tooManyCodes")],
  ["INVALID_OTP", msg("auth.code.invalid")],
  ["OTP_EXPIRED", msg("auth.code.expired")],
  ["TOO_MANY_ATTEMPTS", msg("auth.code.tooManyAttempts")],
]);

export function signInCodeError(error: AuthError) {
  const known = CODE_ERRORS.get(error.code ?? "");
  if (known) return known;
  return error.status === 429
    ? msg("auth.code.tooManyRequests")
    : msg("auth.code.failed");
}

// Expired or exhausted codes need a new one; a rate limit only needs a pause
export const isRetryableCodeError = (error: AuthError) =>
  error.code === "INVALID_OTP" || error.status === 429;

export const loginAttemptSchema = z.object({
  attemptId: z.uuid(),
  // A bad id only loses the person, not the attempt
  distinctId: z
    .string()
    .regex(/^[\w-]{1,64}$/)
    .optional()
    .catch(undefined),
});
export type LoginAttempt = z.input<typeof loginAttemptSchema>;

// Anyone can open the callback with ?error=<text>, so only code-shaped values reach analytics
export const loginErrorCode = (code: string | null | undefined) => {
  const lower = code?.toLowerCase();
  return lower && /^[a-z0-9_]{1,64}$/.test(lower) ? lower : "other";
};

export const startFailureCode = (error: AuthError) =>
  loginErrorCode(error.code ?? `http_${error.status}`);

// fetch rejects with a TypeError when the request never reaches the server
export const thrownFailureCode = (thrown: unknown) =>
  thrown instanceof TypeError ? "network" : "exception";

const PROVIDER_CANCEL_CODES = new Set([
  "access_denied",
  "user_cancelled_authorize",
]);

export function callbackOutcome(redirect: URL) {
  const error = redirect.searchParams.get("error");
  if (error === null) return { event: "login_succeeded" } as const;
  if (PROVIDER_CANCEL_CODES.has(error)) {
    return { event: "login_cancelled", stage: "provider" } as const;
  }
  return {
    event: "login_failed",
    stage: "callback",
    error_code: loginErrorCode(error),
  } as const;
}
