import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

import { env as authEnv } from "@flatsby/auth/env";

/**
 * Compute base URL based on Vercel environment:
 * - Production: Use BETTER_AUTH_URL
 * - Preview: Use VERCEL_URL (auto-generated preview URL)
 * - Development: Use localhost
 */
const baseUrl =
  process.env.VERCEL_ENV === "production"
    ? process.env.BETTER_AUTH_URL
    : process.env.VERCEL_ENV === "preview"
      ? `https://${process.env.VERCEL_URL}`
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
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    BETTER_AUTH_URL: z.string(),
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_BASE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BETTER_AUTH_BASE_URL: baseUrl,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
