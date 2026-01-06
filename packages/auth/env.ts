import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    APPLE_KEY_ID: z.string(),
    APPLE_PRIVATE_KEY: z.string(),
    APPLE_TEAM_ID: z.string(),
    APPLE_BUNDLE_ID: z.string(),
    APPLE_SERVICE_ID: z.string(),
  },
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    APPLE_KEY_ID: process.env.APPLE_KEY_ID,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
    APPLE_BUNDLE_ID: process.env.APPLE_BUNDLE_ID,
    APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
    APPLE_SERVICE_ID: process.env.APPLE_SERVICE_ID,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
