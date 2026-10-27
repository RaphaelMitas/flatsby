import { z } from "zod/v4";

export const loginProviderSchema = z.enum(["google", "apple"]);
export type LoginProvider = z.infer<typeof loginProviderSchema>;

// Rides the OAuth state as additionalData, so the callback's event lands on the person who tapped
export const loginAttemptSchema = z.object({
  attemptId: z.uuid(),
  // A bad id only loses the person, not the attempt
  distinctId: z
    .string()
    .regex(/^[\w-]{1,64}$/)
    .optional()
    .catch(undefined),
});
export type LoginAttempt = z.infer<typeof loginAttemptSchema>;

// Anyone can open the callback with ?error=<text>, so only code-shaped values reach analytics
export const loginErrorCode = (code: string | null | undefined) => {
  const lower = code?.toLowerCase();
  return lower && /^[a-z0-9_]{1,64}$/.test(lower) ? lower : "other";
};

export const startFailureCode = (error: { code?: string; status: number }) =>
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
