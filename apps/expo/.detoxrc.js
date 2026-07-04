/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.ts",
      runInBand: true,
    },
    jest: {
      setupTimeout: 120_000,
    },
  },
  apps: {
    "ios.release": {
      type: "ios.app",
      binaryPath: "build-cache/Flatsby.app",
      build:
        'node -e "console.log(\\"Using prebuilt EAS e2e app at build-cache/Flatsby.app\\")"',
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 17 Pro",
        name: "Flatsby-E2E",
      },
    },
  },
  configurations: {
    "ios.sim.release": {
      device: "simulator",
      app: "ios.release",
    },
  },
};
