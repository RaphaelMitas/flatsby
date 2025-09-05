import { authRouter } from "./router/auth";
import { shoppingList } from "./router/shoppingListRouter";
import { split } from "./router/splitRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  shoppingList: shoppingList,
  split: split,
});

// export type definition of API
export type AppRouter = typeof appRouter;
