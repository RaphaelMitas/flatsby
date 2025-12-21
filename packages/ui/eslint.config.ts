import { defineConfig } from "eslint/config";

import { baseConfig } from "@flatsby/eslint-config/base";
import { reactConfig } from "@flatsby/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
