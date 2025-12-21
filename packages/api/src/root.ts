import { authRouter } from "./router/auth";
import { expenseRouter } from "./router/expenseRouter";
import { shoppingList } from "./router/shoppingListRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  shoppingList: shoppingList,
  expense: expenseRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
