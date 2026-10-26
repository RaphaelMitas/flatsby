import type { NextRequest } from "next/server";

import {
  browserExceptionProperties,
  captureEvent,
  posthog,
} from "@flatsby/api/posthog";
import { trpcFailureProperties } from "@flatsby/api/trpcFailure";

import type { ErrorReport } from "./report";
import { auth } from "~/auth/server";
import { handleBeacon } from "~/utils/beacon";
import { captureVisit } from "~/utils/page-views";
import { errorReportSchema } from "./report";

export const POST = (request: NextRequest) =>
  handleBeacon(request, errorReportSchema, (report) =>
    capture(request.headers, report),
  );

async function capture(headers: Headers, report: ErrorReport) {
  const { origin, pathname } = new URL(report.url);
  // The query and hash can carry free text, like the first chat message
  const page = { url: origin + pathname, referrer: null };
  const properties = {
    ...browserExceptionProperties(report),
    ...(report.trpc && trpcFailureProperties(report.trpc)),
  };
  const session = await auth.api
    .getSession({ headers, query: { disableRefresh: true } })
    .catch(() => null);
  if (!session) {
    // A cookie whose session is gone or unreadable would otherwise read as signed in and drop the report
    const signedOut = new Headers(headers);
    signedOut.delete("cookie");
    return captureVisit("$exception", signedOut, page, properties);
  }
  captureEvent({
    distinctId: session.user.id,
    event: "$exception",
    headers,
    page,
    additionalProperties: properties,
  });
  await posthog?.flush();
}
