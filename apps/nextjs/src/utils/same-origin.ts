import type { NextRequest } from "next/server";

// Other sites could otherwise make their visitors' browsers post analytics here
export function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  return request.headers.get("origin") === request.nextUrl.origin;
}
