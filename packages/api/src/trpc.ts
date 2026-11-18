import type { Auth } from "@flatsby/auth";
import type { Locale } from "@flatsby/i18n/locale";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import { db } from "@flatsby/db/client";
import { redactQueryParams } from "@flatsby/db/errors";
import { defaultLocale, localeFromHeaders } from "@flatsby/i18n/locale";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { translatorFor } from "@flatsby/i18n/translator";

import type { ReceiptScanner } from "./utils/receipt-scan";
import { captureUserEvent } from "./lib/posthog";

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
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error, ctx }) => {
    const translate = translatorFor(ctx?.locale ?? defaultLocale);
    return {
      ...shape,
      message:
        redactQueryParams(shape.message) === shape.message
          ? translateIfKey(translate, shape.message)
          : translate("errors.unexpected"),
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

export const createTRPCRouter = t.router;

function groupIdOf(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if ("groupId" in value && typeof value.groupId === "number") {
    return value.groupId;
  }
  return "data" in value ? groupIdOf(value.data) : undefined;
}

const UNLOGGED_MUTATIONS = new Set([
  "user.setAnalyticsOptOut",
  "stats.homeCardOpened",
]);

const timingMiddleware = t.middleware(
  async ({ ctx, next, path, type, getRawInput }) => {
    if (t._config.isDev) {
      const waitMs = Math.floor(Math.random() * 400) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const start = Date.now();
    const result = await next({ ctx: { path } });
    const durationMs = Date.now() - start;

    if (t._config.isDev) {
      console.log(`[TRPC] ${path} took ${durationMs}ms to execute`);
    }

    if (ctx.session && type === "mutation" && !UNLOGGED_MUTATIONS.has(path)) {
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

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
