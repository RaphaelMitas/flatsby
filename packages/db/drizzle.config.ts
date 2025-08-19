import type { Config } from "drizzle-kit";

import { env } from "./env";

export default {
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  tablesFilter: ["flat-cove_*"], // still called flat-cove because of the old name
} satisfies Config;
