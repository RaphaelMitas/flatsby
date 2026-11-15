import type { Config } from "drizzle-kit";

import { env } from "./env";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  tablesFilter: ["flat-cove_*"],
} satisfies Config;
