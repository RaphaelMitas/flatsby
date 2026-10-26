import { Cause, Effect, Predicate, Result } from "effect";

import type { ApiError, ApiResult } from "../errors";
import { Errors, toApiErrorResult } from "../errors";
import { CurrentRequest } from "./services/CurrentRequest";
import { ErrorReporter } from "./services/ErrorReporter";

const findCode = (cause: unknown): string | undefined => {
  if (Predicate.hasProperty(cause, "code") && Predicate.isString(cause.code))
    return cause.code;
  return Predicate.hasProperty(cause, "cause")
    ? findCode(cause.cause)
    : undefined;
};

const grouping = (
  path: string,
  error: ApiError,
): { kind: string; $exception_fingerprint: string; $issue_name: string } => {
  switch (error._tag) {
    case "NotFoundError":
    case "ForbiddenError":
    case "UnauthorizedError":
    case "ValidationError":
    case "ConflictError":
      return {
        kind: "expected",
        $exception_fingerprint: `${path}:${error._tag}:${error.messageKey}`,
        $issue_name: `${path} ${error._tag}`,
      };
    // Stack grouping would merge these, they're built in a few shared catches
    case "DatabaseError":
    case "ExternalServiceError":
    case "InternalServerError":
      return {
        kind: "system",
        $exception_fingerprint: [
          path,
          error._tag,
          error.operation,
          findCode(error.cause),
        ]
          .filter(Predicate.isNotUndefined)
          .join(":"),
        $issue_name: `${path} ${error._tag} (${error.operation ?? "unknown"})`,
      };
  }
};

export const report = Effect.fnUntraced(function* (error: ApiError) {
  const { user, path, requestId } = yield* CurrentRequest;
  const reporter = yield* ErrorReporter;
  yield* reporter.capture({
    error,
    operation: path,
    distinctId: user.id,
    additionalProperties: {
      ...grouping(path, error),
      requestId,
      error_type: error._tag,
      message_key: error.messageKey,
    },
  });
});

const reportAndMap = Effect.fnUntraced(function* (
  cause: Cause.Cause<ApiError>,
) {
  const failure = Cause.findError(cause);
  if (Result.isSuccess(failure)) {
    yield* report(failure.success);
    return yield* failure.success;
  }

  const defect = Cause.findDefect(cause);
  if (Result.isSuccess(defect)) {
    const { user, path, requestId } = yield* CurrentRequest;
    const reporter = yield* ErrorReporter;
    yield* reporter.capture({
      error: defect.success,
      operation: path,
      distinctId: user.id,
      additionalProperties: { kind: "defect", requestId },
    });
    return yield* Errors.internalServer("operation", defect.success);
  }

  return yield* Effect.failCause(cause);
});

export const toApiResult = Effect.fnUntraced(function* <A, R>(
  effect: Effect.Effect<A, ApiError, R>,
) {
  const result = yield* effect.pipe(
    Effect.catchCause(reportAndMap),
    Effect.result,
  );
  if (Result.isSuccess(result)) {
    return { success: true, data: result.success } satisfies ApiResult<A>;
  }
  const { locale } = yield* CurrentRequest;
  return toApiErrorResult(locale, result.failure);
});
