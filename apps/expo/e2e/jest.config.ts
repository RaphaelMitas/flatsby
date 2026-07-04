import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/**/*.spec.ts"],
  testTimeout: 120_000,
  maxWorkers: 1,
  globalSetup: "<rootDir>/e2e/global-setup.ts",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: [
    "detox/runners/jest/reporter",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/e2e/results",
        outputName: "detox-report.xml",
      },
    ],
  ],
  testEnvironment: "detox/runners/jest/testEnvironment",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/e2e/tsconfig.json",
      },
    ],
  },
  verbose: true,
};

export default config;
