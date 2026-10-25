import type { Locale } from "@flatsby/i18n/locale";
import { Effect, Layer, ManagedRuntime } from "effect";

import type { ApiError, ApiResult } from "../errors";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";
import { ErrorReporter } from "./services/ErrorReporter";
import { toApiResult } from "./toApiResult";

const runtime = ManagedRuntime.make(
  Layer.mergeAll(Database.layer, ErrorReporter.layer),
);

export const runResult = <A>(
  ctx: {
    session: { user: { id: string } };
    locale: Locale;
    path: string;
    requestId: string;
  },
  effect: Effect.Effect<A, ApiError, Database | CurrentRequest>,
): Promise<ApiResult<A>> =>
  runtime.runPromise(
    toApiResult(effect).pipe(
      Effect.provideService(CurrentRequest, {
        user: ctx.session.user,
        locale: ctx.locale,
        path: ctx.path,
        requestId: ctx.requestId,
      }),
    ),
  );
