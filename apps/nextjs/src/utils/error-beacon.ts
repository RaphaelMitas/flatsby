import type { TRPCFailure } from "@flatsby/api/trpcFailure";

import type { ErrorReport } from "~/app/api/err/report";

export const MAX_LENGTH = {
  name: 200,
  message: 2000,
  stack: 10_000,
  url: 2048,
};

const MAX_REPORTS_PER_PAGE_LOAD = 10;
let reportsSent = 0;

export function sendErrorReport(
  error: unknown,
  mechanism: ErrorReport["mechanism"],
  trpc?: TRPCFailure,
) {
  if (reportsSent >= MAX_REPORTS_PER_PAGE_LOAD) return;
  reportsSent++;
  const report: ErrorReport = {
    ...describe(error),
    url: window.location.href.slice(0, MAX_LENGTH.url),
    mechanism,
    trpc,
  };
  navigator.sendBeacon("/api/err", JSON.stringify(report));
}

function describe(thrown: unknown) {
  if (thrown instanceof Error) {
    return {
      name: thrown.name.slice(0, MAX_LENGTH.name),
      message: thrown.message.slice(0, MAX_LENGTH.message),
      stack: thrown.stack?.slice(0, MAX_LENGTH.stack),
    };
  }
  const message =
    // i18n-ignore: error tracking only, never shown
    typeof thrown === "string" ? thrown : `Non-Error ${typeof thrown} thrown`;
  // i18n-ignore
  return { name: "Error", message: message.slice(0, MAX_LENGTH.message) };
}
