import { defineConfig } from "eslint/config";

import { baseConfig } from "@flatsby/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);


