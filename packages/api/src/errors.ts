import type { Locale } from "@flatsby/i18n/locale";
import type { MessageKey } from "@flatsby/i18n/message-key";
import type { Messages } from "@flatsby/i18n/messages";
import { Data, Effect } from "effect";
import { z } from "zod/v4";

import { DrizzleQueryError } from "@flatsby/db/errors";
import { translatorFor } from "@flatsby/i18n/translator";

import { captureError } from "./lib/posthog";

type MessageValues = Record<string, string | number>;

interface Localized {
  readonly messageKey: MessageKey;
  readonly values?: MessageValues;
}

/**
 * Domain Error Types
 * These represent the various error scenarios that can occur in our API.
 * They carry a catalog key; the text is resolved in the request locale.
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<
  Localized & { readonly identifier?: string | number }
> {}

export class ForbiddenError extends Data.TaggedError(
  "ForbiddenError",
)<Localized> {}

export class UnauthorizedError extends Data.TaggedError(
  "UnauthorizedError",
)<Localized> {}

export class ConflictError extends Data.TaggedError("ConflictError")<
  Localized & { readonly cause?: unknown }
> {}

export class ValidationError extends Data.TaggedError("ValidationError")<
  Localized & { readonly cause?: unknown }
> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<
  Localized & {
    readonly operation: string;
    readonly table?: string;
    readonly cause?: unknown;
  }
> {}

export class ExternalServiceError extends Data.TaggedError(
  "ExternalServiceError",
)<
  Localized & {
    readonly service: string;
    readonly operation: string;
    readonly cause?: unknown;
  }
> {}

export class InternalServerError extends Data.TaggedError(
  "InternalServerError",
)<Localized & { readonly operation?: string; readonly cause?: unknown }> {}

const ApiErrorResultSchema = z.object({
  type: z.enum([
    "NotFoundError",
    "ForbiddenError",
    "UnauthorizedError",
    "ConflictError",
    "ValidationError",
    "DatabaseError",
    "ExternalServiceError",
    "InternalServerError",
  ]),
  message: z.string(),
  name: z.string(),
  details: z.record(z.string(), z.unknown()),
});

/**
 * Union type of all possible domain errors
 */
export type ApiError =
  | NotFoundError
  | ForbiddenError
  | UnauthorizedError
  | ConflictError
  | ValidationError
  | DatabaseError
  | ExternalServiceError
  | InternalServerError;

export interface ApiErrorResult {
  success: false;
  error: z.infer<typeof ApiErrorResultSchema>;
}

export type ApiResult<T> = { success: true; data: T } | ApiErrorResult;

/**
 * Utility functions for working with ApiResult ZOD helper
 */
export const getApiResultZod = <T extends z.ZodTypeAny>(dataSchema: T) => {
  return z.discriminatedUnion("success", [
    z.object({
      success: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      success: z.literal(false),
      error: ApiErrorResultSchema,
    }),
  ]);
};

export type NotFoundResource = keyof Messages["errors"]["notFound"];

/**
 * Error factory functions for creating specific errors
 */
export const Errors = {
  notFound: (resource: NotFoundResource, identifier?: string | number) =>
    new NotFoundError({
      messageKey: `errors.notFound.${resource}`,
      identifier,
    }),

  forbidden: (messageKey: MessageKey) => new ForbiddenError({ messageKey }),

  unauthorized: () =>
    new UnauthorizedError({ messageKey: "errors.unauthorized" }),

  conflict: (messageKey: MessageKey, cause?: unknown) =>
    new ConflictError({ messageKey, cause }),

  validation: (
    messageKey: MessageKey,
    values?: MessageValues,
    cause?: unknown,
  ) => new ValidationError({ messageKey, values, cause }),

  database: (
    operation: string,
    table?: string,
    cause?: unknown,
    messageKey: MessageKey = "errors.databaseFailed",
  ) =>
    new DatabaseError({
      messageKey,
      values: { operation },
      operation,
      table,
      cause,
    }),

  externalService: (service: string, operation: string, cause?: unknown) =>
    new ExternalServiceError({
      messageKey: "errors.serviceUnavailable",
      values: { service },
      service,
      operation,
      cause,
    }),

  internalServer: (operation?: string, cause?: unknown) =>
    new InternalServerError({
      messageKey: "errors.unexpected",
      operation,
      cause,
    }),
};

/**
 * Utility functions for working with Effects and errors
 */
export const fail = {
  notFound: (...args: Parameters<typeof Errors.notFound>) =>
    Effect.fail(Errors.notFound(...args)),

  forbidden: (...args: Parameters<typeof Errors.forbidden>) =>
    Effect.fail(Errors.forbidden(...args)),

  unauthorized: () => Effect.fail(Errors.unauthorized()),

  conflict: (...args: Parameters<typeof Errors.conflict>) =>
    Effect.fail(Errors.conflict(...args)),

  validation: (...args: Parameters<typeof Errors.validation>) =>
    Effect.fail(Errors.validation(...args)),

  database: (...args: Parameters<typeof Errors.database>) =>
    Effect.fail(Errors.database(...args)),

  externalService: (...args: Parameters<typeof Errors.externalService>) =>
    Effect.fail(Errors.externalService(...args)),

  internalServer: (...args: Parameters<typeof Errors.internalServer>) =>
    Effect.fail(Errors.internalServer(...args)),
};

/**
 * Helper to convert unknown errors to our domain errors
 */
export const fromUnknownError = (
  error: unknown,
  operation?: string,
): ApiError => {
  if (error instanceof DrizzleQueryError && error.cause) {
    const fromCause = fromUnknownError(error.cause, operation);
    return fromCause._tag === "InternalServerError"
      ? Errors.database(operation ?? "unknown", undefined, error.cause)
      : fromCause;
  }

  if (error instanceof Error) {
    // Check for common database constraint errors
    if (
      error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("duplicate key value")
    ) {
      return Errors.conflict("errors.alreadyExists", error);
    }

    if (
      error.message.includes("FOREIGN KEY constraint failed") ||
      error.message.includes("violates foreign key constraint")
    ) {
      return Errors.validation("errors.invalidReference", undefined, error);
    }

    if (error.message.includes("NOT NULL constraint failed")) {
      const fieldMatch = /NOT NULL constraint failed: \w+\.(\w+)/.exec(
        error.message,
      );
      return Errors.validation(
        "errors.fieldRequired",
        { field: fieldMatch?.[1] ?? "field" },
        error,
      );
    }

    // Check for network/connection errors
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("timeout")
    ) {
      return Errors.externalService(
        "database",
        operation ?? "operation",
        error,
      );
    }

    // Default to database error for other database-related errors
    if (
      error.message.includes("database") ||
      error.message.includes("query") ||
      error.message.includes("transaction")
    ) {
      return Errors.database(operation ?? "unknown", undefined, error);
    }
  }

  // Fallback to internal server error
  return Errors.internalServer(operation, error);
};

/**
 * Utility to safely execute database operations with error conversion
 */
export const safeDbOperation = <T>(
  operation: () => Promise<T>,
  operationName: string,
  tableName?: string,
): Effect.Effect<T, ApiError> => {
  return Effect.tryPromise({
    try: operation,
    catch: (error) => {
      const operation = `${operationName}${tableName ? ` on ${tableName}` : ""}`;
      captureError({ error, operation });
      return fromUnknownError(error, operation);
    },
  });
};

/**
 * Convert Effect to a Result-like object with more detailed error info
 */
export const withErrorHandlingAsResult = async <T>(
  locale: Locale,
  effect: Effect.Effect<T, ApiError>,
): Promise<ApiResult<T>> => {
  const safeEffect = Effect.catchDefect(effect, (defect) => {
    return Effect.fail(fromUnknownError(defect, "operation"));
  });

  const result = await Effect.runPromise(Effect.result(safeEffect));

  return result._tag === "Success"
    ? { success: true, data: result.success }
    : toApiErrorResult(locale, result.failure);
};

export const toApiErrorResult = (
  locale: Locale,
  error: ApiError,
): ApiErrorResult => ({
  success: false,
  error: {
    type: error._tag,
    message: translatorFor(locale)(error.messageKey, error.values),
    name: error.name,
    details: {
      messageKey: error.messageKey,
      ...(error._tag === "NotFoundError" && {
        identifier: error.identifier,
      }),
      ...(error._tag === "DatabaseError" && {
        operation: error.operation,
        table: error.table,
      }),
      ...(error._tag === "ExternalServiceError" && {
        service: error.service,
        operation: error.operation,
      }),
      ...(error._tag === "InternalServerError" && {
        operation: error.operation,
      }),
    },
  },
});
