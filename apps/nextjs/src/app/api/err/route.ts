import type { NextRequest } from "next/server";
import { after } from "next/server";

import { browserExceptionProperties, captureEvent } from "@flatsby/api/posthog";
import { trpcFailureProperties } from "@flatsby/api/trpcFailure";

import type { ErrorReport } from "./report";
import { auth } from "~/auth/server";
import { captureVisit } from "~/utils/page-views";
import { isSameOrigin } from "~/utils/same-origin";
import { errorReportSchema } from "./report";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const report = errorReportSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (
    !report.success ||
    new URL(report.data.url).host !== request.headers.get("host")
  ) {
    return new Response(null, { status: 400 });
  }
  after(() => capture(request.headers, report.data));
  return new Response(null, { status: 204 });
}

async function capture(headers: Headers, report: ErrorReport) {
  const page = { url: report.url, referrer: null };
  const properties = {
    ...browserExceptionProperties(report),
    ...(report.trpc && trpcFailureProperties(report.trpc)),
  };
  const session = await auth.api.getSession({ headers });
  if (session) {
    captureEvent({
      distinctId: session.user.id,
      event: "$exception",
      headers,
      page,
      additionalProperties: properties,
    });
  } else {
    await captureVisit("$exception", headers, page, properties);
  }
}
