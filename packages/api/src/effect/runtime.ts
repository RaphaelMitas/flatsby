import type { Locale } from "@flatsby/i18n/locale";
import { Effect, Layer, ManagedRuntime } from "effect";

import type { ApiError, ApiResult } from "../errors";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";
import { ErrorReporter } from "./services/ErrorReporter";
import { toApiResult, toApiResultAs } from "./toApiResult";

const runtime = ManagedRuntime.make(
  Layer.mergeAll(Database.layer, ErrorReporter.layer),
);

interface RequestContext {
  session: { user: { id: string } };
  locale: Locale;
  path: string;
  requestId: string;
}

export const run = <A>(
  ctx: RequestContext,
  effect: Effect.Effect<A, never, Database | ErrorReporter | CurrentRequest>,
): Promise<A> =>
  runtime.runPromise(
    effect.pipe(
      Effect.provideService(CurrentRequest, {
        user: ctx.session.user,
        locale: ctx.locale,
        path: ctx.path,
        requestId: ctx.requestId,
      }),
    ),
  );

export const runResult = <A>(
  ctx: RequestContext,
  effect: Effect.Effect<A, ApiError, Database | CurrentRequest>,
): Promise<ApiResult<A>> => run(ctx, toApiResult(effect));

export const runPublicResult = <A>(
  ctx: Omit<RequestContext, "session"> & {
    session: RequestContext["session"] | null;
  },
  effect: Effect.Effect<A, ApiError, Database>,
): Promise<ApiResult<A>> =>
  runtime.runPromise(
    toApiResultAs(
      {
        user: ctx.session?.user,
        locale: ctx.locale,
        path: ctx.path,
        requestId: ctx.requestId,
      },
      effect,
    ),
  );
