import { z } from "zod/v4";

import { loginErrorCode, loginMethodSchema } from "@flatsby/validators/login";

import { MAX_LENGTH } from "~/utils/error-beacon";

const attempt = {
  url: z.url().max(MAX_LENGTH.url),
  provider: loginMethodSchema,
  attempt_id: z.uuid(),
};

// OAuth outcomes are captured on the callback; only an email code ends in the page
const emailAttempt = { ...attempt, provider: z.literal("email") };

export const loginEventSchema = z.discriminatedUnion("event", [
  z.object({ ...attempt, event: z.literal("login_provider_tapped") }),
  z.object({
    ...attempt,
    event: z.literal("login_failed"),
    stage: z.enum(["start", "code"]).default("start"),
    error_code: z.string().transform(loginErrorCode),
  }),
  z.object({
    ...emailAttempt,
    event: z.literal("login_cancelled"),
    stage: z.literal("code"),
  }),
  z.object({ ...emailAttempt, event: z.literal("login_succeeded") }),
]);

export type LoginEvent = z.input<typeof loginEventSchema>;
