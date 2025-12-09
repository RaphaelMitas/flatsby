import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@flatsby/eslint-config/base";

export default defineConfig(
  {
    ignores: ["script/**"],
  },
  baseConfig,
  restrictEnvAccess,
);


