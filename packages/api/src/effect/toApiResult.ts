import { Cause, Effect, Result } from "effect";

import type { ApiError, ApiResult } from "../errors";
import { Errors, toApiErrorResult } from "../errors";
import { CurrentRequest } from "./services/CurrentRequest";
import { ErrorReporter } from "./services/ErrorReporter";

const reportCause = Effect.fnUntraced(function* (cause: Cause.Cause<ApiError>) {
  const { user, path, requestId } = yield* CurrentRequest;
  const reporter = yield* ErrorReporter;

  const failure = Cause.findError(cause);
  if (Result.isSuccess(failure)) {
    const error = failure.success;
    return yield* reporter.capture({
      error,
      operation: path,
      distinctId: user.id,
      additionalProperties: {
        kind: "expected",
        requestId,
        error_type: error._tag,
        message_key: error.messageKey,
        $exception_fingerprint: `${path}:${error._tag}:${error.messageKey}`,
        $issue_name: `${path} ${error._tag}`,
      },
    });
  }

  const defect = Cause.findDefect(cause);
  if (Result.isSuccess(defect)) {
    return yield* reporter.capture({
      error: defect.success,
      operation: path,
      distinctId: user.id,
      additionalProperties: { kind: "defect", requestId },
    });
  }
});

export const toApiResult = Effect.fnUntraced(function* <A, R>(
  effect: Effect.Effect<A, ApiError, R>,
) {
  const result = yield* effect.pipe(
    Effect.tapCause(reportCause),
    Effect.catchDefect((defect) =>
      Effect.fail(Errors.internalServer("operation", defect)),
    ),
    Effect.result,
  );
  if (Result.isSuccess(result)) {
    return { success: true, data: result.success } satisfies ApiResult<A>;
  }
  const { locale } = yield* CurrentRequest;
  return toApiErrorResult(locale, result.failure);
});
