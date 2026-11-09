import { after } from "next/server";

import { posthog } from "@flatsby/api/posthog";

import { auth } from "~/auth/server";

const handler = (request: Request) => {
  after(() => posthog?.flush());
  return auth.handler(request);
};

export { handler as GET, handler as POST };
