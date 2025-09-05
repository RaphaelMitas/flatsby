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

// Export new error handling utilities
export {
  // Error types and factories
  Errors,
  fail,
  toTRPCError,
  fromUnknownError,
  // Main utilities
  runEffectWithTRPCError,
  safeDbOperation,
} from "./errors";

export {
  // Database utilities
  DbUtils,
  // Validation utilities
  ValidationUtils,
  // Common operation patterns
  OperationUtils,
  // Migration helpers
  effectify,
} from "./utils";

export type { ApiError, ApiResult, ApiErrorResult } from "./errors";

// Export database and query types
export type {
  Database,
  DatabaseOperation,
  DbTransaction,
  ShoppingList,
  ShoppingListItem,
  ShoppingListInfiniteData,
  ShoppingListSummary,
  ShoppingListWithGroup,
  ShoppingListWithItems,
  TransactionOperation,
  User,
} from "./types";

export { calculateOwedAmounts } from "./split/calculations";
