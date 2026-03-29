import Constants from "expo-constants";

const PRODUCTION_URL = "https://www.flatsby.com";

/**
 * Installs a global fetch interceptor that rewrites requests from the
 * production URL to the given E2E preview URL. This is necessary because
 * both the auth client and tRPC resolve their base URL eagerly at module
 * load time, before the E2E deep link can provide the correct URL.
 */
export function installE2EBaseUrlOverride(targetUrl: string) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith(PRODUCTION_URL)) {
      input = input.replace(PRODUCTION_URL, targetUrl);
    } else if (input instanceof Request && input.url.startsWith(PRODUCTION_URL)) {
      const newUrl = input.url.replace(PRODUCTION_URL, targetUrl);
      input = new Request(newUrl, {
        method: input.method,
        headers: input.headers,
        body: input.body as BodyInit_ | undefined,
        signal: input.signal,
      });
    }
    return originalFetch(input, init);
  };
}

export const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    return PRODUCTION_URL;
  }
  return `http://${localhost}:3000`;
};
