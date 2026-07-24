import Constants from "expo-constants";

import { getE2EConfig } from "./e2e-config";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = (): string => {
  const e2e = getE2EConfig();
  if (e2e) {
    return e2e.apiUrl;
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    return "https://www.flatsby.com";
  }
  return `http://localhost:3000`;
};
