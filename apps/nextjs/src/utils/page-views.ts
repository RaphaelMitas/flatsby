import { getSessionCookie } from "better-auth/cookies";
import { isbot } from "isbot";

import { captureCookieless, captureEvent, posthog } from "@flatsby/api/posthog";

function isVisitor(headers: Headers) {
  const userAgent = headers.get("user-agent");
  if (!userAgent || isbot(userAgent)) return false;
  if (getSessionCookie(headers)) return false;
  return headers.get("sec-gpc") !== "1" && headers.get("dnt") !== "1";
}

function botSignal(headers: Headers) {
  if (!headers.get("accept-language")) return "no_accept_language";
  const userAgent = headers.get("user-agent") ?? "";
  if (userAgent.includes(" Chrome/") && !headers.has("sec-ch-ua")) {
    return "chrome_without_client_hints";
  }
  return undefined;
}

export async function captureVisit(
  event: string,
  headers: Headers,
  page: { url: string; referrer: string | null },
  additionalProperties?: Record<string, unknown>,
) {
  if (!isVisitor(headers)) return;
  await captureCookieless({
    event,
    headers,
    page,
    additionalProperties: {
      bot_signal: botSignal(headers),
      ...additionalProperties,
    },
  });
}

export function withoutCookie(headers: Headers) {
  const signedOut = new Headers(headers);
  signedOut.delete("cookie");
  return signedOut;
}

export function pageWithoutQuery(url: string) {
  const { origin, pathname } = new URL(url);
  return { url: origin + pathname, referrer: null };
}

export async function captureFor(
  distinctId: string | undefined,
  event: string,
  headers: Headers,
  page: { url: string; referrer: string | null },
  properties: Record<string, unknown>,
) {
  if (!distinctId) {
    return captureVisit(event, withoutCookie(headers), page, properties);
  }
  captureEvent({
    distinctId,
    event,
    headers,
    page,
    additionalProperties: properties,
  });
  await posthog?.flush();
}
