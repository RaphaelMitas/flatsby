import type { NextRequest } from "next/server";

import { handleBeacon } from "~/utils/beacon";
import { captureVisit, withoutCookie } from "~/utils/page-views";
import { loginEventSchema } from "./event";

export const POST = (request: NextRequest) =>
  handleBeacon(request, loginEventSchema, ({ url, event, ...properties }) => {
    const { origin, pathname } = new URL(url);
    return captureVisit(
      event,
      withoutCookie(request.headers),
      { url: origin + pathname, referrer: null },
      {
        ...properties,
        platform: "web",
        ...(event === "login_failed" && { stage: "start" }),
      },
    );
  });
