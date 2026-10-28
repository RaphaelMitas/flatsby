import type {
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";

import type { ApiResult } from "./errors";

export type QuerySnapshot = { queryKey: QueryKey; previous: unknown }[];

export const PENDING_ID = -1;

export const isPendingId = (id: number) => id < 0;

export const restoreSnapshot =
  (queryClient: QueryClient) => (snapshot: QuerySnapshot) => {
    for (const { queryKey, previous } of snapshot)
      queryClient.setQueryData(queryKey, previous);
  };

interface ResultMutationOptions<TData, TInput, TContext> {
  onMutate?: (input: TInput) => TContext | Promise<TContext>;
  rollback?: (context: NonNullable<TContext>) => void;
  /** Gets the server's message, or undefined when the request itself threw. */
  onFailure?: (message: string | undefined) => void;
  onSuccess?: (data: TData, input: TInput, context: TContext) => void;
  onSettled?: () => void;
}

/** Procedures fail two ways: they throw, or return `success: false`. */
export const resultMutation = <TData, TInput, TContext = undefined>({
  onMutate,
  rollback,
  onFailure,
  onSuccess,
  onSettled,
}: ResultMutationOptions<TData, TInput, TContext>) => {
  const fail = (context: TContext | undefined, message: string | undefined) => {
    if (context != null) rollback?.(context);
    onFailure?.(message);
  };
  return {
    onMutate,
    onError: (_error: unknown, _input: TInput, context: TContext | undefined) =>
      fail(context, undefined),
    onSuccess: (result: ApiResult<TData>, input: TInput, context: TContext) => {
      if (result.success) onSuccess?.(result.data, input, context);
      else fail(context, result.error.message);
    },
    onSettled,
  };
};

export const failureOf = (
  { data, error }: { data?: ApiResult<unknown>; error: unknown },
  fallback: string,
) => {
  if (data?.success === false) return data.error.message;
  if (error) return fallback;
  return undefined;
};

export const optimisticMutation = <TData, TInput, TCached>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  patchFor: (input: TInput) => (cached: TCached) => TCached,
  {
    onFailure,
    onSuccess,
    invalidate = [],
  }: {
    onFailure?: (message: string | undefined) => void;
    onSuccess?: (data: TData, input: TInput) => void;
    invalidate?: QueryFilters[];
  } = {},
) =>
  resultMutation({
    onMutate: async (input: TInput) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<ApiResult<TCached>>(queryKey, (old) =>
        old?.success ? { ...old, data: patchFor(input)(old.data) } : old,
      );
      return [{ queryKey, previous }];
    },
    rollback: restoreSnapshot(queryClient),
    onFailure,
    onSuccess,
    onSettled: () => {
      for (const filters of [{ queryKey }, ...invalidate])
        void queryClient.invalidateQueries(filters);
    },
  });
