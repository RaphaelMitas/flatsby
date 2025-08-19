import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Flatsby",
  slug: "flatcove",
  scheme: "flatcove",
  owner: "frenchrapho",
  version: "0.4.0",
  orientation: "portrait",
  icon: "./assets/ios-light.png",
  userInterfaceStyle: "automatic",
  updates: { fallbackToCacheTimeout: 0 },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.flatsby.app.v2",
    supportsTablet: true,
    icon: {
      light: "./assets/ios-light.png",
      dark: "./assets/ios-dark.png",
      tinted: "./assets/ios-tinted.png",
    },
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "com.flatcove.app",
    blockedPermissions: ["android.permission.READ_PHONE_STATE"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },
  extra: { eas: { projectId: "7b82dd84-3fdf-4f1d-953a-7dd9bfa39314" } },
  experiments: { tsconfigPaths: true, typedRoutes: true },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "react-native-bottom-tabs",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E4E4E7",
        image: "./assets/splash-icon-light.png",
        dark: {
          backgroundColor: "#151718",
          image: "./assets/splash-icon-dark.png",
        },
      },
    ],
    ["expo-build-properties", { ios: { useFrameworks: "static" } }],
    ["expo-font", { fonts: ["./assets/fonts/lucide.ttf"] }],
  ],
});
