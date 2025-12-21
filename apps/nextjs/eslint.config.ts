import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@flatsby/eslint-config/base";
import { nextjsConfig } from "@flatsby/eslint-config/nextjs";
import { reactConfig } from "@flatsby/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
