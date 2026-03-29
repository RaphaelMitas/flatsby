import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/** SecureStore key used by E2E tests to override the API URL at runtime. */
export const E2E_API_URL_KEY = "e2e_api_url";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  // Runtime override injected by the E2E deep link handler.
  // This lets tests point the app at an ephemeral preview deployment
  // without rebuilding.
  const e2eUrl = SecureStore.getItem(E2E_API_URL_KEY);
  if (e2eUrl) {
    return e2eUrl;
  }

  /**
   * Gets the IP address of your host-machine. If it cannot automatically find it,
   * you'll have to manually set it. NOTE: Port 3000 should work for most but confirm
   * you don't have anything else running on it, or you'd have to change it.
   *
   * **NOTE**: This is only for development. In production, you'll want to set the
   * baseUrl to your production API URL.
   */
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    return "https://www.flatsby.com";
  }
  return `http://${localhost}:3000`;
};
