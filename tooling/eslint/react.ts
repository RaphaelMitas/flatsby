import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export const reactConfig = defineConfig(
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...eslintReact.configs["recommended-typescript"],
    languageOptions: {
      globals: {
        React: "writable",
      },
    },
    rules: {
      "@eslint-react/no-nested-component-definitions": "warn",
      "@eslint-react/component-hook-factories": "warn",
      "@eslint-react/unsupported-syntax": "warn",
    },
  },
  reactHooks.configs.flat["recommended-latest"]!,
);
