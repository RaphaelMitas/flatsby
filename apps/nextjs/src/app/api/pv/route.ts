import type { NextRequest } from "next/server";
import { z } from "zod/v4";

import { handleBeacon } from "~/utils/beacon";
import { captureVisit } from "~/utils/page-views";

const navigationSchema = z.object({
  url: z.url().max(2048),
  referrer: z.url().max(2048).nullable(),
});

export const POST = (request: NextRequest) =>
  handleBeacon(request, navigationSchema, (navigation) =>
    captureVisit("$pageview", request.headers, navigation),
  );
