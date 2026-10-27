import { z } from "zod/v4";

import { loginErrorCode, loginProviderSchema } from "@flatsby/validators/login";

const attempt = {
  url: z.url().max(2048),
  provider: loginProviderSchema,
  attempt_id: z.uuid(),
};

export const loginEventSchema = z.discriminatedUnion("event", [
  z.object({ ...attempt, event: z.literal("login_provider_tapped") }),
  z.object({
    ...attempt,
    event: z.literal("login_failed"),
    error_code: z.string().transform(loginErrorCode),
  }),
]);

export type LoginEvent = z.input<typeof loginEventSchema>;
