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

type Requester = Omit<CurrentRequest["Service"], "user"> & {
  readonly user?: CurrentRequest["Service"]["user"];
};

const capture = Effect.fnUntraced(function* (
  { user, path, requestId }: Requester,
  error: unknown,
  properties: Record<string, unknown>,
) {
  const reporter = yield* ErrorReporter;
  yield* reporter.capture({
    error,
    operation: path,
    distinctId: user?.id,
    additionalProperties: { ...properties, requestId },
  });
});

const reportAs = (requester: Requester, error: ApiError) =>
  capture(requester, error, {
    ...grouping(requester.path, error),
    error_type: error._tag,
    message_key: error.messageKey,
  });

export const report = (error: ApiError) =>
  CurrentRequest.use((request) => reportAs(request, error));

const reportAndMap = Effect.fnUntraced(function* (
  requester: Requester,
  cause: Cause.Cause<ApiError>,
) {
  const failure = Cause.findError(cause);
  if (Result.isSuccess(failure)) {
    yield* reportAs(requester, failure.success);
    return yield* failure.success;
  }

  const defect = Cause.findDefect(cause);
  if (Result.isSuccess(defect)) {
    yield* capture(requester, defect.success, { kind: "defect" });
    return yield* Errors.internalServer("operation", defect.success);
  }

  return yield* Effect.failCause(cause);
});

/** Takes the request explicitly so public procedures can report a signed-out visitor. */
export const toApiResultAs = Effect.fnUntraced(function* <A, R>(
  requester: Requester,
  effect: Effect.Effect<A, ApiError, R>,
) {
  const result = yield* effect.pipe(
    Effect.catchCause((cause) => reportAndMap(requester, cause)),
    Effect.result,
  );
  if (Result.isSuccess(result)) {
    return { success: true, data: result.success } satisfies ApiResult<A>;
  }
  return toApiErrorResult(requester.locale, result.failure);
});

export const toApiResult = <A, R>(effect: Effect.Effect<A, ApiError, R>) =>
  CurrentRequest.use((request) => toApiResultAs(request, effect));
