import type { ConfigContext, ExpoConfig } from "expo/config";

const isE2E = process.env.E2E_TESTING === "true";
const WEB_HOST = "www.flatsby.com";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Flatsby",
  slug: "flatsby",
  scheme: "flatsby",
  owner: "flatsby",
  version: "0.11.1",
  orientation: "portrait",
  icon: "./assets/ios-light.png",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.flatcove.app.v2",
    supportsTablet: true,
    associatedDomains: [`applinks:${WEB_HOST}`],
    icon: {
      light: "./assets/ios-light.png",
      dark: "./assets/ios-dark.png",
      tinted: "./assets/ios-tinted.png",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      AppStoreID: "6747908544",
      // The e2e suite talks to a plain-HTTP server on the runner, which App
      // Transport Security blocks in a Release build.
      ...(isE2E && {
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
          NSExceptionDomains: {
            localhost: { NSExceptionAllowsInsecureHTTPLoads: true },
          },
        },
      }),
    },
    privacyManifests: {
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeName",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
          ],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
          ],
        },
        {
          NSPrivacyCollectedDataType:
            "NSPrivacyCollectedDataTypeOtherUserContent",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            "NSPrivacyCollectedDataTypePurposeProductPersonalization",
          ],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
          ],
        },
        {
          NSPrivacyCollectedDataType:
            "NSPrivacyCollectedDataTypeProductInteraction",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAnalytics",
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
          ],
        },
      ],
    },
  },
  android: {
    package: "com.flatcove.app",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: WEB_HOST, pathPrefix: "/join" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    blockedPermissions: ["android.permission.READ_PHONE_STATE"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  extra: {
    eas: {
      projectId: "f7e9d15f-497c-4f4e-ac97-f59a14638cdd",
    },
    e2eTesting: isE2E,
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCompiler: true,
  },
  updates: {
    url: "https://u.expo.dev/f7e9d15f-497c-4f4e-ac97-f59a14638cdd",
    // Bare prebuild + xcodebuild has no EAS channel headers, so every launch
    // would hit the update server and 400.
    enabled: !isE2E,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    ["expo-localization", { supportedLocales: ["en", "de"] }],
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
    [
      "expo-build-properties",
      {
        ios: { ccacheEnabled: isE2E, enableSceneSupport: true },
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Same reason as the iOS ATS exception: the e2e server is HTTP.
          ...(isE2E && { usesCleartextTraffic: true }),
        },
      },
    ],
    ["expo-font", { fonts: ["./assets/fonts/lucide.ttf"] }],
  ],
});
