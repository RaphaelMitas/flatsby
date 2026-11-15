import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";
import { createTRPCContext } from "./trpc";

type RouterInputs = inferRouterInputs<AppRouter>;

type RouterOutputs = inferRouterOutputs<AppRouter>;

export { createTRPCContext, appRouter };
export type { AppRouter, RouterInputs, RouterOutputs };

export { captureError } from "./lib/posthog";

export type { ApiResult, ApiErrorResult } from "./errors";

export { e2eReceiptScanner } from "./utils/receipt-scan";

export type {
  ExpenseWithSplitsAndMembers,
  GroupMemberWithUserInfo,
  GroupWithAccess,
  GroupWithMemberCount,
  ShoppingListInfiniteData,
  ShoppingListSummary,
} from "./types";
