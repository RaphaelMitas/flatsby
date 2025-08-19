// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("@expo/metro-config");
const { FileStore } = require("metro-cache");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

// Create the default Metro config
const config = getDefaultConfig(__dirname);

// Add the NativeWind configuration
const nativeWindConfig = withNativeWind(config, {
  input: "./src/styles.css",
  configPath: "./tailwind.config.ts",
});

// Make sure the asset plugins are properly configured
nativeWindConfig.transformer = {
  ...nativeWindConfig.transformer,
  assetPlugins: ["expo-asset/tools/hashAssetFiles"],
};

// Add the Turborepo cache configuration
const finalConfig = withTurborepoManagedCache(nativeWindConfig);

// Enable package exports resolution
finalConfig.resolver.unstable_enablePackageExports = true;

module.exports = finalConfig;

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure Turborepo to invalidate it when needed.
 *
 * @see https://turbo.build/repo/docs/reference/configuration#env
 * @param {import('@expo/metro-config').MetroConfig} config
 * @returns {import('@expo/metro-config').MetroConfig}
 */
function withTurborepoManagedCache(config) {
  config.cacheStores = [
    new FileStore({ root: path.join(__dirname, ".cache/metro") }),
  ];
  return config;
}
