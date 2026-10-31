import type { NextRequest } from "next/server";

import { handleBeacon } from "~/utils/beacon";
import {
  captureVisit,
  pageWithoutQuery,
  withoutCookie,
} from "~/utils/page-views";
import { loginEventSchema } from "./event";

export const POST = (request: NextRequest) =>
  handleBeacon(request, loginEventSchema, ({ url, event, ...properties }) =>
    captureVisit(event, withoutCookie(request.headers), pageWithoutQuery(url), {
      ...properties,
      platform: "web",
    }),
  );
