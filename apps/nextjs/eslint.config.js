import baseConfig, { restrictEnvAccess } from "@flatsby/eslint-config/base";
import nextjsConfig from "@flatsby/eslint-config/nextjs";
import reactConfig from "@flatsby/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
