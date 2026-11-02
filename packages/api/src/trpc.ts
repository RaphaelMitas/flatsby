/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import type { Auth } from "@flatsby/auth";
import type { Locale } from "@flatsby/i18n/locale";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import { DrizzleQueryError } from "@flatsby/db";
import { db } from "@flatsby/db/client";
import { defaultLocale, localeFromHeaders } from "@flatsby/i18n/locale";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { translatorFor } from "@flatsby/i18n/translator";

import type { ReceiptScanner } from "./utils/receipt-scan";
import { captureUserEvent } from "./lib/posthog";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
  signal?: AbortSignal;
  scanReceipt?: ReceiptScanner;
}): Promise<{
  authApi: Auth["api"];
  headers: Headers;
  session: Awaited<ReturnType<Auth["api"]["getSession"]>>;
  authMs: number;
  db: typeof db;
  locale: Locale;
  requestId: string;
  signal?: AbortSignal;
  scanReceipt?: ReceiptScanner;
}> => {
  const authApi = opts.auth.api;
  const authStart = Date.now();
  const session = await authApi.getSession({
    headers: opts.headers,
  });
  return {
    authApi,
    headers: opts.headers,
    session,
    authMs: Date.now() - authStart,
    db,
    locale: localeFromHeaders(opts.headers),
    requestId: crypto.randomUUID(),
    signal: opts.signal,
    scanReceipt: opts.scanReceipt,
  };
};
/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  // Errors keep catalog keys server-side so error reporting groups across languages.
  errorFormatter: ({ shape, error, ctx }) => {
    const translate = translatorFor(ctx?.locale ?? defaultLocale);
    return {
      ...shape,
      // DrizzleQueryError's message embeds the query params, which hold user data
      message:
        error.cause instanceof DrizzleQueryError
          ? translate("errors.unexpected")
          : translateIfKey(translate, shape.message),
      data: {
        ...shape.data,
        requestId: ctx?.requestId,
        zodError:
          error.cause instanceof ZodError
            ? z.flattenError(
                error.cause as ZodError<Record<string, unknown>>,
                (issue) => translateIfKey(translate, issue.message),
              )
            : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

// Most inputs name the group; joining an invite only learns it, so its result carries it
function groupIdOf(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if ("groupId" in value && typeof value.groupId === "number") {
    return value.groupId;
  }
  return "data" in value ? groupIdOf(value.data) : undefined;
}

const timingMiddleware = t.middleware(
  async ({ ctx, next, path, type, getRawInput }) => {
    if (t._config.isDev) {
      // simulates production latency so request waterfalls show up locally
      const waitMs = Math.floor(Math.random() * 400) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const start = Date.now();
    const result = await next({ ctx: { path } });
    const durationMs = Date.now() - start;

    if (t._config.isDev) {
      console.log(`[TRPC] ${path} took ${durationMs}ms to execute`);
    }

    // Capturing the objection itself would send the account to PostHog one more time
    if (
      ctx.session &&
      type === "mutation" &&
      path !== "user.setAnalyticsOptOut"
    ) {
      // a streaming procedure returns before its body runs, so its duration and outcome are unknown here
      const isStream = result.ok && Symbol.asyncIterator in Object(result.data);
      captureUserEvent({
        user: ctx.session.user,
        event: path,
        headers: ctx.headers,
        additionalProperties: {
          procedure: path,
          authMs: ctx.authMs,
          groupId:
            groupIdOf(await getRawInput()) ??
            (result.ok ? groupIdOf(result.data) : undefined),
          ...(!isStream && { ok: result.ok, durationMs }),
        },
      });
    }

    return result;
  },
);

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Create a server-side caller factory for calling tRPC procedures directly
 * This is used for internal calls (e.g., from chat tools) without HTTP overhead
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;
