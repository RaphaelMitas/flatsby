import type { createTRPCContext } from "./trpc";
import { analyticsRouter } from "./router/analyticsRouter";
import { authRouter } from "./router/auth";
import { chatRouter } from "./router/chatRouter";
import { expenseRouter } from "./router/expenseRouter";
import { groupRouter } from "./router/groupRouter";
import { shoppingList } from "./router/shoppingListRouter";
import { statsRouter } from "./router/statsRouter";
import { userRouter } from "./router/userRouter";
import { createCallerFactory, createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  auth: authRouter,
  chat: chatRouter,
  group: groupRouter,
  shoppingList: shoppingList,
  expense: expenseRouter,
  stats: statsRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export const callerFactory = createCallerFactory(appRouter);
export type RouterCaller = ReturnType<typeof callerFactory>;

export function createRouterCaller(
  ctx: Awaited<ReturnType<typeof createTRPCContext>>,
): RouterCaller {
  return callerFactory(ctx);
}
