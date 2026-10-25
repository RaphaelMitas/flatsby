import type { MessageKey } from "@flatsby/i18n/message-key";
import { Context, Effect, Layer } from "effect";

import { db } from "@flatsby/db/client";

import type { ApiError, NotFoundResource } from "../../errors";
import type { Database as DbClient } from "../../types";
import { Errors, fail, fromUnknownError } from "../../errors";

const query = <T>(
  operation: string,
  run: (db: DbClient) => Promise<T>,
  options?: { messageKey?: MessageKey },
): Effect.Effect<T, ApiError> =>
  Effect.tryPromise({
    try: () => run(db),
    catch: (cause) =>
      options?.messageKey
        ? Errors.database(operation, undefined, cause, options.messageKey)
        : fromUnknownError(cause, operation),
  });

const findOneOrFail = <T>(
  resource: NotFoundResource,
  run: (db: DbClient) => Promise<T | undefined>,
): Effect.Effect<T, ApiError> =>
  Effect.flatMap(query(`find ${resource}`, run), (row) =>
    row === undefined ? fail.notFound(resource) : Effect.succeed(row),
  );

export class Database extends Context.Service<
  Database,
  {
    readonly query: typeof query;
    readonly findOneOrFail: typeof findOneOrFail;
  }
>()("@flatsby/api/effect/services/Database") {
  static readonly layer = Layer.succeed(Database, { query, findOneOrFail });
}
