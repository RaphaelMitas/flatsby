import { MutationCache, QueryCache } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { z } from "zod/v4";

import type { AppRouter } from "./root";

const inputIdKey = z.string().max(64).regex(/Id$/);
const inputIdValue = z.union([z.string().max(64), z.number()]);

export const trpcFailureSchema = z.object({
  path: z.string().max(200),
  type: z.enum(["query", "mutation"]),
  // Absent when the server never answered
  code: z.string().max(50).optional(),
  httpStatus: z.number().int().optional(),
  inputIds: z.record(inputIdKey, inputIdValue),
  attempts: z.number().int().min(0).max(100),
  hadCachedData: z.boolean().optional(),
});

export type TRPCFailure = z.infer<typeof trpcFailureSchema>;

export function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    isRecord(error.data) &&
    error.data.code === "UNAUTHORIZED"
  );
}

export function trpcFailureCaches(
  report: (error: Error, failure: TRPCFailure) => void,
) {
  return {
    queryCache: new QueryCache({
      onError: (error, query) => {
        const answer = classify(error);
        if (!answer) return;
        const keyMeta = query.queryKey[1];
        report(error, {
          ...answer,
          path: procedurePath(query.queryKey),
          type: "query",
          inputIds: idsOf(isRecord(keyMeta) ? keyMeta.input : undefined),
          // The cache counts the final failure before it calls onError
          attempts: query.state.fetchFailureCount,
          hadCachedData: query.state.data !== undefined,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, _onMutateResult, mutation) => {
        const answer = classify(error);
        if (!answer) return;
        report(error, {
          ...answer,
          path: procedurePath(mutation.options.mutationKey),
          type: "mutation",
          inputIds: idsOf(variables),
          // The cache calls onError before it counts the final failure
          attempts: mutation.state.failureCount + 1,
        });
      },
    }),
  };
}

function classify(error: Error) {
  if (!(error instanceof TRPCClientError) || isUnauthorizedError(error)) {
    return undefined;
  }
  const trpcError: TRPCClientError<AppRouter> = error;
  const data = trpcError.data;
  // A body without tRPC error data (a proxy's error page, a superjson mismatch) still means the server answered.
  // The web's stream link drops the response, so there only the parse error tells.
  const answered =
    trpcError.meta?.response !== undefined ||
    trpcError.cause instanceof SyntaxError;
  return {
    code: data?.code ?? (answered ? "UNREADABLE_RESPONSE" : undefined),
    httpStatus: data?.httpStatus,
  };
}

export function trpcFailureProperties(failure: TRPCFailure) {
  const { path, code } = failure;
  return {
    $exception_fingerprint: code ? `trpc:${path}:${code}` : "trpc:unreachable",
    $issue_name: code ? `${path} ${code}` : "API unreachable",
    trpc_path: path,
    trpc_type: failure.type,
    ...(code && { trpc_code: code }),
    ...(failure.httpStatus !== undefined && {
      http_status: failure.httpStatus,
    }),
    input_ids: failure.inputIds,
    ...(failure.hadCachedData !== undefined && {
      had_cached_data: failure.hadCachedData,
    }),
    attempts: failure.attempts,
  };
}

function procedurePath(key: readonly unknown[] | undefined): string {
  const path: unknown = key?.[0];
  return Array.isArray(path) ? path.join(".") : "unknown";
}

function idsOf(input: unknown): Record<string, string | number> {
  if (!isRecord(input)) return {};
  return Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, string | number] =>
        inputIdKey.safeParse(entry[0]).success &&
        inputIdValue.safeParse(entry[1]).success,
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
