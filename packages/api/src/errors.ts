import { TRPCError } from "@trpc/server";
import { Data, Effect } from "effect";
import { z } from "zod/v4";

/**
 * Domain Error Types
 * These represent the various error scenarios that can occur in our API
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string;
  readonly identifier?: string | number;
  readonly userMessage?: string;
}> {
  get message() {
    return (
      this.userMessage ??
      `${this.resource} not found${this.identifier ? ` (ID: ${this.identifier})` : ""}`
    );
  }
}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly action: string;
  readonly resource?: string;
  readonly userMessage?: string;
}> {
  get message() {
    return (
      this.userMessage ??
      `You don't have permission to ${this.action}${this.resource ? ` ${this.resource}` : ""}`
    );
  }
}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly userMessage?: string;
}> {
  get message() {
    return this.userMessage ?? "You must be logged in to access this resource";
  }
}

export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly resource: string;
  readonly reason: string;
  readonly userMessage?: string;
}> {
  get message() {
    return (
      this.userMessage ??
      `Cannot ${this.reason} ${this.resource} due to a conflict`
    );
  }
}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly reason: string;
  readonly userMessage?: string;
}> {
  get message() {
    return this.userMessage ?? `${this.field}: ${this.reason}`;
  }
}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string;
  readonly table?: string;
  readonly cause?: unknown;
  readonly userMessage?: string;
}> {
  get message() {
    return (
      this.userMessage ??
      `Database operation failed${this.operation ? `: ${this.operation}` : ""}`
    );
  }
}

export class ExternalServiceError extends Data.TaggedError(
  "ExternalServiceError",
)<{
  readonly service: string;
  readonly operation: string;
  readonly cause?: unknown;
  readonly userMessage?: string;
}> {
  get message() {
    return (
      this.userMessage ??
      `External service (${this.service}) is currently unavailable`
    );
  }
}

export class InternalServerError extends Data.TaggedError(
  "InternalServerError",
)<{
  readonly operation?: string;
  readonly cause?: unknown;
  readonly userMessage?: string;
}> {
  get message() {
    return (
      this.userMessage ??
      "An unexpected error occurred. Please try again later."
    );
  }
}

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

/**
 * Error factory functions for creating specific errors
 */
export const Errors = {
  notFound: (
    resource: string,
    identifier?: string | number,
    userMessage?: string,
  ) => new NotFoundError({ resource, identifier, userMessage }),

  forbidden: (action: string, resource?: string, userMessage?: string) =>
    new ForbiddenError({ action, resource, userMessage }),

  unauthorized: (userMessage?: string) =>
    new UnauthorizedError({ userMessage }),

  conflict: (resource: string, reason: string, userMessage?: string) =>
    new ConflictError({ resource, reason, userMessage }),

  validation: (field: string, reason: string, userMessage?: string) =>
    new ValidationError({ field, reason, userMessage }),

  database: (
    operation: string,
    table?: string,
    cause?: unknown,
    userMessage?: string,
  ) => new DatabaseError({ operation, table, cause, userMessage }),

  externalService: (
    service: string,
    operation: string,
    cause?: unknown,
    userMessage?: string,
  ) => new ExternalServiceError({ service, operation, cause, userMessage }),

  internalServer: (operation?: string, cause?: unknown, userMessage?: string) =>
    new InternalServerError({ operation, cause, userMessage }),
};

/**
 * Utility functions for working with Effects and errors
 */
export const fail = {
  notFound: (resource: string, userMessage?: string) =>
    Effect.fail(Errors.notFound(resource, userMessage)),

  forbidden: (action: string, resource?: string, userMessage?: string) =>
    Effect.fail(Errors.forbidden(action, resource, userMessage)),

  unauthorized: (userMessage?: string) =>
    Effect.fail(Errors.unauthorized(userMessage)),

  conflict: (resource: string, reason: string, userMessage?: string) =>
    Effect.fail(Errors.conflict(resource, reason, userMessage)),

  validation: (field: string, reason: string, userMessage?: string) =>
    Effect.fail(Errors.validation(field, reason, userMessage)),

  database: (
    operation: string,
    table?: string,
    cause?: unknown,
    userMessage?: string,
  ) => Effect.fail(Errors.database(operation, table, cause, userMessage)),

  externalService: (
    service: string,
    operation: string,
    cause?: unknown,
    userMessage?: string,
  ) =>
    Effect.fail(Errors.externalService(service, operation, cause, userMessage)),

  internalServer: (operation?: string, cause?: unknown, userMessage?: string) =>
    Effect.fail(Errors.internalServer(operation, cause, userMessage)),
};

/**
 * Convert domain errors to tRPC errors
 */
export const toTRPCError = (error: ApiError): TRPCError => {
  switch (error._tag) {
    case "NotFoundError":
      return new TRPCError({
        code: "NOT_FOUND",
        message: error.message,
      });

    case "ForbiddenError":
      return new TRPCError({
        code: "FORBIDDEN",
        message: error.message,
      });

    case "UnauthorizedError":
      return new TRPCError({
        code: "UNAUTHORIZED",
        message: error.message,
      });

    case "ConflictError":
      return new TRPCError({
        code: "CONFLICT",
        message: error.message,
      });

    case "ValidationError":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });

    case "DatabaseError":
      console.error("Database error:", error.cause);
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });

    case "ExternalServiceError":
      console.error("External service error:", error.cause);
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });

    case "InternalServerError":
    default:
      console.error("Internal server error:", error.cause);
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
  }
};

/**
 * Helper to convert unknown errors to our domain errors
 */
export const fromUnknownError = (
  error: unknown,
  operation?: string,
): ApiError => {
  if (error instanceof Error) {
    // Check for common database constraint errors
    if (
      error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("duplicate key value")
    ) {
      return Errors.conflict(
        "resource",
        "create duplicate",
        "This item already exists",
      );
    }

    if (
      error.message.includes("FOREIGN KEY constraint failed") ||
      error.message.includes("violates foreign key constraint")
    ) {
      return Errors.validation(
        "reference",
        "invalid reference",
        "Invalid reference to related data",
      );
    }

    if (error.message.includes("NOT NULL constraint failed")) {
      const fieldMatch = /NOT NULL constraint failed: \w+\.(\w+)/.exec(
        error.message,
      );
      const field = fieldMatch?.[1] ?? "field";
      return Errors.validation(field, "required", `${field} is required`);
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
    catch: (error) =>
      fromUnknownError(
        error,
        `${operationName}${tableName ? ` on ${tableName}` : ""}`,
      ),
  });
};

/**
 * Utility to run Effect and convert errors to tRPC errors
 */
export const runEffectWithTRPCError = async <T>(
  effect: Effect.Effect<T, ApiError>,
): Promise<T> => {
  return Effect.runPromise(Effect.mapError(effect, toTRPCError));
};

/**
 * Middleware helper for tRPC procedures using Effect
 * @deprecated Use withErrorHandlingAsResult instead
 */
export const withErrorHandling = <T>(
  effect: Effect.Effect<T, ApiError>,
): Promise<T> => {
  return runEffectWithTRPCError(effect);
};

/**
 * Convert Effect to a Result-like object with more detailed error info
 */
export const withErrorHandlingAsResult = async <T>(
  effect: Effect.Effect<T, ApiError>,
): Promise<ApiResult<T>> => {
  const safeEffect = Effect.catchAllDefect(effect, (defect) => {
    return Effect.fail(fromUnknownError(defect, "operation"));
  });

  const either = await Effect.runPromise(Effect.either(safeEffect));

  if (either._tag === "Right") {
    return {
      success: true,
      data: either.right,
    };
  } else {
    const error = either.left;
    return {
      success: false,
      error: {
        type: error._tag,
        message: error.message,
        name: error.name,
        details: {
          ...(error._tag === "NotFoundError" && {
            resource: error.resource,
            identifier: error.identifier,
          }),
          ...(error._tag === "ValidationError" && {
            field: error.field,
            reason: error.reason,
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
          ...(error._tag === "ForbiddenError" && {
            action: error.action,
            resource: error.resource,
          }),
          ...(error._tag === "UnauthorizedError" && {
            userMessage: error.userMessage,
            cause: error.cause,
          }),
          ...(error._tag === "ConflictError" && {
            resource: error.resource,
            reason: error.reason,
          }),
        },
      },
    };
  }
};
