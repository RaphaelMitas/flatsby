import type { NextRequest } from "next/server";
import type { z } from "zod/v4";
import { after } from "next/server";

// Other sites could otherwise make their visitors' browsers post analytics here
function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  return request.headers.get("origin") === request.nextUrl.origin;
}

export async function handleBeacon<T extends { url: string }>(
  request: NextRequest,
  schema: z.ZodType<T>,
  capture: (body: T) => Promise<unknown>,
) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (
    !body.success ||
    new URL(body.data.url).host !== request.headers.get("host")
  ) {
    return new Response(null, { status: 400 });
  }
  after(() => capture(body.data));
  return new Response(null, { status: 204 });
}
