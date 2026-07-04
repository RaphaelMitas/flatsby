import Constants from "expo-constants";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const host = debuggerHost?.split(":")[0];

  if (!host) {
    return "https://www.flatsby.com";
  }
  // On iOS simulator, localhost refers to the simulator itself.
  // Use host.macos (iOS 17+) to reach the Mac's localhost.
  if (host === "localhost" || host === "127.0.0.1") {
    return `http://host.macos:3000`;
  }
  return `http://${host}:3000`;
};
