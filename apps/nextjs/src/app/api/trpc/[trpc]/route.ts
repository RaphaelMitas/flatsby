import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import {
  appRouter,
  captureError,
  createTRPCContext,
  e2eReceiptScanner,
} from "@flatsby/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

const handler = async (req: NextRequest) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        auth: auth,
        headers: req.headers,
        signal: req.signal,
        scanReceipt: env.E2E_TESTING ? e2eReceiptScanner : undefined,
      }),
    onError({ error, path, ctx }) {
      if (getHTTPStatusCodeFromError(error) < 500) return;
      captureError({
        error: error.cause ?? error,
        operation: `trpc.${path}`,
        distinctId: ctx?.session?.user.id,
        additionalProperties: {
          trpcCode: error.code,
          requestId: ctx?.requestId,
        },
      });
    },
  });

  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
