import Constants from "expo-constants";

const PRODUCTION_URL = "https://www.flatsby.com";

let e2eTargetUrl: string | null = null;

export function getE2ETargetUrl(): string | null {
  return e2eTargetUrl;
}

function rewriteUrl(url: string): string {
  if (e2eTargetUrl && url.startsWith(PRODUCTION_URL)) {
    return url.replace(PRODUCTION_URL, e2eTargetUrl);
  }
  return url;
}

/**
 * Installs a global fetch interceptor that rewrites requests from the
 * production URL to the given E2E preview URL. This is necessary because
 * both the auth client and tRPC resolve their base URL eagerly at module
 * load time, before the E2E deep link can provide the correct URL.
 *
 * Both @better-fetch and tRPC's httpBatchLink read globalThis.fetch fresh
 * on every request, so this interceptor reliably rewrites URLs for both.
 */
export function installE2EBaseUrlOverride(targetUrl: string) {
  e2eTargetUrl = targetUrl;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    if (typeof input === "string") {
      input = rewriteUrl(input);
    } else if (input instanceof Request && input.url.startsWith(PRODUCTION_URL)) {
      const newUrl = rewriteUrl(input.url);
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
