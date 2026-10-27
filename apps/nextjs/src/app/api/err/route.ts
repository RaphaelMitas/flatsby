import type { NextRequest } from "next/server";

import { browserExceptionProperties } from "@flatsby/api/posthog";
import { trpcFailureProperties } from "@flatsby/api/trpcFailure";

import type { ErrorReport } from "./report";
import { auth } from "~/auth/server";
import { handleBeacon } from "~/utils/beacon";
import { captureFor } from "~/utils/page-views";
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
  return captureFor(session?.user.id, "$exception", headers, page, properties);
}
