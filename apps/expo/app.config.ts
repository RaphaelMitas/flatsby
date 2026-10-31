import type { ConfigContext, ExpoConfig } from "expo/config";
import type { ConfigPlugin } from "expo/config-plugins";
import { withAndroidManifest } from "expo/config-plugins";

const isE2E = process.env.E2E_TESTING === "true";
const WEB_HOST = "www.flatsby.com";

const appConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Flatsby",
  slug: "flatsby",
  scheme: "flatsby",
  owner: "flatsby",
  version: "0.17.0",
  orientation: "portrait",
  icon: "./assets/ios-light.png",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.flatcove.app.v2",
    supportsTablet: true,
    associatedDomains: [`applinks:${WEB_HOST}`, `webcredentials:${WEB_HOST}`],
    icon: {
      light: "./assets/ios-light.png",
      dark: "./assets/ios-dark.png",
      tinted: "./assets/ios-tinted.png",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      AppStoreID: "6747908544",
      // Without it the PostHog plugin hooks notification taps at launch, before consent is known
      "com.posthog.posthog.CAPTURE_PUSH_NOTIFICATION_OPENED": false,
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
        ios: { ccacheEnabled: isE2E },
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Same reason as the iOS ATS exception: the e2e server is HTTP.
          ...(isE2E && { usesCleartextTraffic: true }),
        },
      },
    ],
    ["expo-font", { fonts: ["./assets/fonts/lucide.ttf"] }],
    [
      "expo-notifications",
      {
        icon: "./assets/adaptive-icon.png",
        // Reminders are scheduled on the device, so no APNs entitlement
        enableRemoteNotifications: false,
      },
    ],
  ],
});

// Android's sampled heap checker segfaults walking Hermes frames on free,
// killing about one e2e flow per Android run
const withoutGwpAsan: ConfigPlugin = (config) =>
  withAndroidManifest(config, (manifest) => {
    const application = manifest.modResults.manifest.application?.[0];
    if (application) application.$["android:gwpAsanMode"] = "never";
    return manifest;
  });

export default (context: ConfigContext): ExpoConfig =>
  isE2E ? withoutGwpAsan(appConfig(context)) : appConfig(context);
