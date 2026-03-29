import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

import { env as authEnv } from "@flatsby/auth/env";

/**
 * Compute base URL:
 * - Vercel (any env): Use BETTER_AUTH_URL — the canonical auth domain registered
 *   with OAuth providers. The oAuthProxy plugin uses `request.url` (not baseURL)
 *   to detect whether it's on the production origin, so preview deployments
 *   accessed via their auto-generated URL still get correct proxy behavior.
 * - Development: Use localhost
 */
const baseUrl = process.env.VERCEL_URL
  ? process.env.BETTER_AUTH_URL
  : "http://localhost:3000";

export const env = createEnv({
  extends: [authEnv, vercel()],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_URL: z.string(),
    POSTHOG_API_KEY: z.string().optional(),
    E2E_TESTING: z.coerce.boolean().default(false),
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_BASE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BETTER_AUTH_BASE_URL:
      process.env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL ?? baseUrl,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
