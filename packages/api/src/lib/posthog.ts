import {
  detectBrowser,
  detectBrowserVersion,
  detectDevice,
  detectDeviceType,
  detectOS,
} from "@posthog/core";
import { PostHog } from "posthog-node";

import { DrizzleQueryError } from "@flatsby/db/errors";
import { redactInvitePath } from "@flatsby/validators/invite";

const apiKey = process.env.POSTHOG_API_KEY;

export const posthog =
  apiKey && process.env.NODE_ENV === "production"
    ? new PostHog(apiKey, {
        host: "https://eu.i.posthog.com",
      })
    : null;

// Campaign params that PostHog tracks (sync with posthog-js)
const CAMPAIGN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gad_source",
  "mc_cid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "twclid",
  "li_fat_id",
  "igshid",
  "ttclid",
  "rdt_cid",
  "epik",
  "qclid",
  "sccid",
  "irclid",
  "_kx",
];

function getCampaignParamsFromUrl(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    for (const param of CAMPAIGN_PARAMS) {
      const value = urlObj.searchParams.get(param);
      if (value) {
        params[param] = value;
      }
    }
    return params;
  } catch {
    return {};
  }
}

function getReferringDomain(referrer: string | null): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).host;
  } catch {
    return undefined;
  }
}

function getSearchEngine(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host;
    if (host.includes("google.")) return "google";
    if (host.includes("bing.com")) return "bing";
    if (host.includes("yahoo.com")) return "yahoo";
    if (host.includes("duckduckgo.com")) return "duckduckgo";
    if (host.includes("baidu.com")) return "baidu";
    if (host.includes("yandex.")) return "yandex";
    return null;
  } catch {
    return null;
  }
}

function getPathname(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

function getBrowserLanguage(headers: Headers): string | undefined {
  const acceptLanguage = headers.get("accept-language");
  if (!acceptLanguage) return undefined;
  // Parse first language from "en-US,en;q=0.9,de;q=0.8"
  return acceptLanguage.split(",")[0]?.trim();
}

function getBrowserLanguagePrefix(headers: Headers): string | undefined {
  const lang = getBrowserLanguage(headers);
  return lang?.split("-")[0];
}

interface PageUrls {
  url: string;
  referrer: string | null;
}

export function buildPostHogProperties(headers: Headers, page?: PageUrls) {
  const userAgent = headers.get("user-agent");
  const rawReferer = headers.get("referer");
  // An API call's referer is the page it was made from, so it stands in for both
  const rawUrl = page ? page.url : rawReferer;
  const rawReferrer = page ? page.referrer : rawReferer;
  const currentUrl = rawUrl ? redactInvitePath(rawUrl) : undefined;
  const referer = rawReferrer ? redactInvitePath(rawReferrer) : null;

  // Detect browser/device info from user agent using @posthog/core
  const vendor = ""; // Not available server-side
  const [osName, osVersion] = userAgent
    ? detectOS(userAgent)
    : [undefined, undefined];
  const browser = userAgent ? detectBrowser(userAgent, vendor) : undefined;
  const browserVersion = userAgent
    ? detectBrowserVersion(userAgent, vendor)
    : undefined;
  const device = userAgent ? detectDevice(userAgent) : undefined;
  const deviceType = userAgent ? detectDeviceType(userAgent) : undefined;

  // Get referrer info
  const referringDomain = getReferringDomain(referer);
  const searchEngine = getSearchEngine(referer);

  // Get campaign params from current URL
  const campaignParams = currentUrl ? getCampaignParamsFromUrl(currentUrl) : {};

  // Build properties object, filtering out undefined values
  const properties: Record<string, unknown> = {
    // URL and host info
    $host: headers.get("host"),
    $current_url: currentUrl,
    $pathname: getPathname(currentUrl),

    // User agent
    $raw_user_agent:
      userAgent && userAgent.length > 1000
        ? `${userAgent.slice(0, 997)}...`
        : userAgent,

    // Browser detection
    $browser: browser,
    $browser_version: browserVersion,
    $browser_language: getBrowserLanguage(headers),
    $browser_language_prefix: getBrowserLanguagePrefix(headers),

    // OS detection
    $os: osName,
    $os_version: osVersion,

    // Device detection
    $device: device,
    $device_type: deviceType,

    // Referrer info
    $referrer: referer ?? "$direct",
    $referring_domain: referringDomain ?? "$direct",
    $search_engine: searchEngine,

    // Campaign params
    ...campaignParams,
  };

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined),
  );
}

// DrizzleQueryError's message embeds the query params, which hold user data,
// and errors like TRPCError copy their cause's message when given none
function withoutQueryErrors(error: unknown): unknown {
  if (error instanceof DrizzleQueryError)
    return withoutQueryErrors(error.cause);
  if (!(error instanceof Error) || !(error.cause instanceof Error))
    return error;
  const cause = withoutQueryErrors(error.cause);
  if (cause === error.cause) return error;
  const inherited = error.message === error.cause.message;
  const copy = new Error(
    inherited && cause instanceof Error ? cause.message : error.message,
    { cause },
  );
  copy.name = error.name;
  copy.stack = error.stack?.replace(error.message, copy.message);
  return copy;
}

export function captureError({
  error,
  operation,
  distinctId,
  additionalProperties,
}: {
  error: unknown;
  operation: string;
  distinctId?: string;
  additionalProperties?: Record<string, unknown>;
}) {
  const cause = withoutQueryErrors(error);

  if (process.env.NODE_ENV === "development") {
    console.error(`[${operation}]`, cause);
  }

  if (!posthog) return;

  posthog.captureException(cause, distinctId, {
    $exception_source: "server",
    operation,
    ...additionalProperties,
  });
}

export function captureEvent({
  distinctId,
  event,
  headers,
  additionalProperties,
}: {
  distinctId: string;
  event: string;
  headers: Headers;
  additionalProperties?: Record<string, unknown>;
}) {
  if (!posthog) return;
  posthog.capture({
    distinctId,
    event,
    properties: {
      ...buildPostHogProperties(headers),
      ...additionalProperties,
    },
  });
}

function clientIp(headers: Headers) {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    undefined
  );
}

// Click IDs like gclid, or anything else a link carries, could recognize a visitor across days
function keepOnlyUtmParams(url: string) {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (!key.startsWith("utm_")) parsed.searchParams.delete(key);
    }
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

// PostHog hashes IP, user agent and host with a daily salt, so the device stores nothing
export async function captureCookieless({
  event,
  headers,
  page,
  additionalProperties,
}: {
  event: string;
  headers: Headers;
  page: PageUrls;
  additionalProperties?: Record<string, unknown>;
}) {
  const url = keepOnlyUtmParams(page.url);
  if (!posthog || !url) return;
  const referrer = page.referrer && keepOnlyUtmParams(page.referrer);
  await posthog.captureImmediate({
    distinctId: "$posthog_cookieless",
    event,
    properties: {
      ...buildPostHogProperties(headers, { url, referrer }),
      $cookieless_mode: true,
      // Without it PostHog hashes our server's IP and every visitor collapses into one
      $ip: clientIp(headers),
      $process_person_profile: false,
      ...additionalProperties,
    },
  });
}
