import Constants from "expo-constants";

import { getE2EApiUrlOverride } from "./e2e";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  const e2eApiUrl = getE2EApiUrlOverride();
  if (e2eApiUrl) {
    return e2eApiUrl;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    return "https://www.flatsby.com";
  }
  return `http://localhost:3000`;
};
