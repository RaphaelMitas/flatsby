// Learn more: https://docs.expo.dev/guides/monorepos/
const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const { withNativewind } = require("nativewind/metro");

const projectRoot = fs.realpathSync(__dirname);
const config = getDefaultConfig(projectRoot);

config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, "node_modules", ".cache", "metro"),
  }),
];

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = withNativewind(config);
