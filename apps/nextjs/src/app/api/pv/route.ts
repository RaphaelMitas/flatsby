import type { NextRequest } from "next/server";
import { after } from "next/server";
import { z } from "zod/v4";

import { captureVisit } from "~/utils/page-views";

const navigationSchema = z.object({
  url: z.url().max(2048),
  referrer: z.url().max(2048).nullable(),
});

// Other sites could otherwise make their visitors' browsers report page views here
function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  return request.headers.get("origin") === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const navigation = navigationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (
    !navigation.success ||
    new URL(navigation.data.url).host !== request.headers.get("host")
  ) {
    return new Response(null, { status: 400 });
  }
  after(() => captureVisit("$pageview", request.headers, navigation.data));
  return new Response(null, { status: 204 });
}
