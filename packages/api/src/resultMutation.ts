import type { ApiResult } from "./errors";

interface ResultMutationOptions<TData, TInput, TContext> {
  onMutate?: (input: TInput) => TContext | Promise<TContext>;
  rollback?: (context: NonNullable<TContext>) => void;
  /** Gets the server's message, or undefined when the request itself threw. */
  onFailure?: (message: string | undefined) => void;
  onSuccess?: (data: TData, input: TInput, context: TContext) => void;
  onSettled?: () => void;
}

/** Mutation callbacks that roll back and report both ways a procedure fails: it throws, or it returns `success: false`. */
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

/** The message to show when a mutation or query failed either way, otherwise undefined. */
export const failureOf = (
  { data, error }: { data?: ApiResult<unknown>; error: unknown },
  fallback: string,
) => {
  if (data?.success === false) return data.error.message;
  if (error) return fallback;
  return undefined;
};
