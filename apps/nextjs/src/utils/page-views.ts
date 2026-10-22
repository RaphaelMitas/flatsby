import { isbot } from "isbot";

import { captureCookieless } from "@flatsby/api/posthog";

function isVisitor(headers: Headers) {
  const userAgent = headers.get("user-agent");
  if (!userAgent || isbot(userAgent)) return false;
  return headers.get("sec-gpc") !== "1" && headers.get("dnt") !== "1";
}

// Weak hints stay filterable in PostHog rather than dropping real visitors on a guess
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
