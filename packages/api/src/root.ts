import { authRouter } from "./router/auth";
import { expenseRouter } from "./router/expenseRouter";
import { groupRouter } from "./router/groupRouter";
import { shoppingList } from "./router/shoppingListRouter";
import { userRouter } from "./router/userRouter";
import { wrappedRouter } from "./router/wrappedRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  group: groupRouter,
  shoppingList: shoppingList,
  wrapped: wrappedRouter,
  expense: expenseRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
