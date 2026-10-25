import type { AppRouter } from "@flatsby/api";
import type { Mutation, Query } from "@tanstack/react-query";
import { getNetworkStateAsync, NetworkStateType } from "expo-network";
import { TRPCClientError } from "@trpc/client";

import { posthog } from "./analytics/posthog";

export function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    isRecord(error.data) &&
    error.data.code === "UNAUTHORIZED"
  );
}

interface FailedOperation {
  type: "query" | "mutation";
  key: readonly unknown[] | undefined;
  input: unknown;
  attempts: number;
  hadCachedData?: boolean;
}

export function reportQueryError(
  error: Error,
  query: Query<unknown, unknown, unknown>,
) {
  const keyMeta = query.queryKey[1];
  void reportTRPCError(error, {
    type: "query",
    key: query.queryKey,
    input: isRecord(keyMeta) ? keyMeta.input : undefined,
    // The cache counts the final failure before it calls onError
    attempts: query.state.fetchFailureCount,
    hadCachedData: query.state.data !== undefined,
  });
}

export function reportMutationError(
  error: Error,
  variables: unknown,
  _onMutateResult: unknown,
  mutation: Mutation<unknown, unknown, unknown>,
) {
  void reportTRPCError(error, {
    type: "mutation",
    key: mutation.options.mutationKey,
    input: variables,
    // The cache calls onError before it counts the final failure
    attempts: mutation.state.failureCount + 1,
  });
}

async function reportTRPCError(error: Error, operation: FailedOperation) {
  if (!(error instanceof TRPCClientError) || isUnauthorizedError(error)) return;
  const trpcError: TRPCClientError<AppRouter> = error;
  const network = await getNetworkStateAsync().catch(() => undefined);
  const path = procedurePath(operation.key);
  const data = trpcError.data;
  // A response tRPC couldn't read is a client bug, not an outage
  const code =
    data?.code ??
    (trpcError.meta?.response ? "UNREADABLE_RESPONSE" : undefined);
  if (!code && network?.isInternetReachable === false) return;

  posthog.captureException(trpcError, {
    $exception_fingerprint: code ? `trpc:${path}:${code}` : "trpc:unreachable",
    $issue_name: code ? `${path} ${code}` : "API unreachable",
    trpc_path: path,
    trpc_type: operation.type,
    ...(code && { trpc_code: code }),
    ...(data && { http_status: data.httpStatus }),
    input_ids: idsOf(operation.input),
    ...(operation.hadCachedData !== undefined && {
      had_cached_data: operation.hadCachedData,
    }),
    attempts: operation.attempts,
    network_type: network?.type ?? NetworkStateType.UNKNOWN,
  });
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
        entry[0].endsWith("Id") &&
        (typeof entry[1] === "string" || typeof entry[1] === "number"),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
