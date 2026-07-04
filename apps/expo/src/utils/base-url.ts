import Constants from "expo-constants";

const PRODUCTION_API_URL = "https://www.flatsby.com";

/**
 * Resolve the API base URL for the current build/runtime:
 * - E2E builds bake EXPO_PUBLIC_API_BASE_URL at compile time
 * - Dev client uses localhost when Metro is on the same machine
 * - Release builds fall back to production
 */
export const getBaseUrl = () => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.length > 0) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const host = debuggerHost?.split(":")[0];

  if (!host) {
    return PRODUCTION_API_URL;
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3000";
  }
  return `http://${host}:3000`;
};
