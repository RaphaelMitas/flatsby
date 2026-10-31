import { z } from "zod/v4";

import {
  loginErrorCode,
  loginFailureStageSchema,
  loginMethodSchema,
} from "@flatsby/validators/login";

import { MAX_LENGTH } from "~/utils/error-beacon";

const attempt = {
  url: z.url().max(MAX_LENGTH.url),
  provider: loginMethodSchema,
  attempt_id: z.uuid(),
};

// OAuth outcomes are captured on the callback; email codes and passkeys end in the page
const pageAttempt = { ...attempt, provider: z.enum(["email", "passkey"]) };

export const loginEventSchema = z.discriminatedUnion("event", [
  z.object({ ...attempt, event: z.literal("login_provider_tapped") }),
  z.object({
    ...attempt,
    event: z.literal("login_failed"),
    stage: loginFailureStageSchema.default("start"),
    error_code: z.string().transform(loginErrorCode),
  }),
  z.object({
    ...pageAttempt,
    event: z.literal("login_cancelled"),
    stage: z.enum(["code", "sheet"]),
  }),
  z.object({ ...pageAttempt, event: z.literal("login_succeeded") }),
  z.object({
    url: attempt.url,
    event: z.literal("passkey_created"),
    source: z.enum(["offer", "settings"]),
  }),
]);

export type LoginEvent = z.input<typeof loginEventSchema>;
