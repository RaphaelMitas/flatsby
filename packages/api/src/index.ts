import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";
import { createTRPCContext } from "./trpc";

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { createTRPCContext, appRouter };
export type { AppRouter, RouterInputs, RouterOutputs };

export { captureError } from "./lib/posthog";

export type { ApiResult, ApiErrorResult } from "./errors";

// Export database and query types
export type {
  ExpenseWithSplitsAndMembers,
  GroupMemberWithUserInfo,
  GroupWithAccess,
  GroupWithMemberCount,
  ShoppingListInfiniteData,
  ShoppingListSummary,
} from "./types";
